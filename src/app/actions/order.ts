"use server";

import { createServerClient } from "@/lib/supabase";
import { getServerUser } from "@/lib/server-user";

// 生成的 Database 类型尚缺 referrer_id 列，临时用宽松客户端访问
type LooseClient = { from: (table: string) => any };

export interface OrderItemInput {
  productId: string;
  title: string;
  quantity: number;
  unitPrice: number;
  image: string | null;
}

export interface CreateOrderInput {
  items: OrderItemInput[];
  address: string;
  receiver: string;
  phone: string;
}

/** 生成订单号：ZL + yyyyMMdd + 6位随机 */
function genOrderNo(): string {
  const d = new Date();
  const ymd =
    `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `ZL${ymd}${rand}`;
}

/**
 * 创建订单（须登录）。用 service role 读取/写入，绕 RLS。
 * 服务端二次核价 + 扣库存（权威数据来自 zhuli_products，不信任客户端传的价格/快照）：
 *  1) 读取商品真实库存/状态/价格；
 *  2) 校验 status='listed' 且 stock >= 数量；
 *  3) 以服务端价格 (platform_price ?? supply_price) 重算金额并生成快照；
 *  4) 用条件更新（WHERE stock>=qty）扣减库存，防止超卖；
 *  5) 写入订单主表 + 明细（状态机入口：pending_payment）。
 * 说明：客户端仍传 order.items 的 title/unitPrice/image，但服务端一律忽略，仅以 productId+quantity 为准。
 */
export async function createOrder(input: CreateOrderInput) {
  // 校验登录
  const user = await getServerUser();
  if (!user) return { error: "请先登录" };

  // 校验商品数量
  if (!input.items?.length) return { error: "订单不能为空" };

  const qtyMap = new Map<string, number>();
  for (const it of input.items) {
    const q = Number(it.quantity);
    if (!Number.isFinite(q) || q <= 0) return { error: "商品数量无效" };
    qtyMap.set(it.productId, (qtyMap.get(it.productId) ?? 0) + q);
  }

  const server = createServerClient();

  // 1) 一次性读取涉及的商品（服务端权威数据）
  const productIds = Array.from(qtyMap.keys());
  const { data: products, error: prodErr } = await server
    .from("zhuli_products")
    .select("id, title, status, stock, supply_price, platform_price, images")
    .in("id", productIds);
  if (prodErr) return { error: prodErr.message };
  const pmap = new Map(products.map((p) => [p.id, p]));

  // 2) 校验与计价
  const detailRows: {
    product_id: string;
    quantity: number;
    unit_price: number;
    snapshot: { title: string; image: string | null; unit_price: number };
  }[] = [];
  let total = 0;
  for (const [pid, qty] of qtyMap) {
    const p = pmap.get(pid);
    if (!p) return { error: "存在无效商品" };
    if (p.status !== "listed") return { error: `「${p.title}」已下架` };
    if ((p.stock ?? 0) < qty)
      return { error: `「${p.title}」库存不足（仅剩 ${p.stock ?? 0} 件）` };
    const unit = Number(p.platform_price ?? p.supply_price);
    total += unit * qty;
    detailRows.push({
      product_id: pid,
      quantity: qty,
      unit_price: unit,
      snapshot: { title: p.title, image: p.images?.[0] ?? null, unit_price: unit },
    });
  }
  if (detailRows.length === 0) return { error: "订单不能为空" };

  // 3) 扣库存（条件更新防超卖；若并发导致库存不足，更新返回 0 行则判定失败）
  for (const [pid, qty] of qtyMap) {
    const { data: upd, error: updErr } = await server
      .from("zhuli_products")
      .update({ stock: (pmap.get(pid)?.stock ?? 0) - qty })
      .eq("id", pid)
      .gte("stock", qty)
      .select("stock")
      .single();
    if (updErr || !upd) {
      const p = pmap.get(pid);
      return {
        error: `「${p?.title ?? "商品"}」库存不足，请调整数量后重试`,
      };
    }
  }

  // 4) 写订单主表（附带来源推广者 referrer_id）
  const orderNo = genOrderNo();
  const { data: buyerRow } = await (server as unknown as LooseClient)
    .from("zhuli_users")
    .select("referrer_id")
    .eq("id", user.id)
    .maybeSingle();
  const { data: order, error: orderErr } = await (server as unknown as LooseClient)
    .from("zhuli_orders")
    .insert({
      order_no: orderNo,
      user_id: user.id,
      type: "proxy",
      status: "pending_payment",
      total_amount: total,
      platform_fee: 0,
      address: {
        receiver: input.receiver,
        phone: input.phone,
        full: input.address,
      },
      notes: null,
      referrer_id: buyerRow?.referrer_id ?? null,
    })
    .select()
    .single();

  if (orderErr || !order) return { error: orderErr?.message ?? "订单创建失败" };

  // 5) 写订单明细
  const { error: itemsErr } = await server
    .from("zhuli_order_items")
    .insert(detailRows.map((d) => ({ order_id: order.id, ...d })));

  if (itemsErr) return { error: itemsErr.message };

  return { orderId: order.id, orderNo: order.order_no };
}

/**
 * 用户标记「已转账」。
 * 人工转账模式：用户提交转账意向后，将 payment_intent 置为 manual_transfer_submitted，
 * 并追加一条备注。后续由管理员/客服核实后，将订单状态流转到 paid（微信支付接入点预留：
 * 正式版在有微信支付时，此处替换为拉起微信支付 JSAPI/小程序支付，回调成功后再置 paid）。
 */
export async function submitTransferProof(orderId: string) {
  if (!orderId) return { error: "缺少订单" };

  const user = await getServerUser();
  if (!user) return { error: "请先登录" };

  const server = createServerClient();

  // 读取当前订单，确认归属并合并备注
  const { data: order, error: orderErr } = await server
    .from("zhuli_orders")
    .select("id, user_id, status, payment_intent, notes")
    .eq("id", orderId)
    .single();
  if (orderErr || !order) return { error: "订单不存在" };
  if (order.user_id !== user.id) return { error: "无权操作该订单" };
  if (order.status !== "pending_payment") return { error: "当前状态无需转账标记" };

  const prevNotes = order.notes ? `${order.notes}\n` : "";
  const now = new Date().toLocaleString("zh-CN");

  const { error: updErr } = await server
    .from("zhuli_orders")
    .update({
      payment_intent: "manual_transfer_submitted",
      notes: `${prevNotes}[用户已于 ${now} 提交转账，待核实]`,
    })
    .eq("id", orderId);
  if (updErr) return { error: updErr.message };

  return { ok: true };
}