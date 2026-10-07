"use server";

import { createServerClient } from "@/lib/supabase";
import { getServerUser } from "@/lib/server-user";

/** 当前登录用户是否为管理员（读 zhuli_users.role） */
async function getAdmin() {
  const user = await getServerUser();
  if (!user) return null;

  const server = createServerClient();
  const { data: row } = await server
    .from("zhuli_users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  return row?.role === "admin" ? user : null;
}

export interface AdminOrderItem {
  id: string;
  quantity: number;
  unit_price: number;
  snapshot: { title?: string; image?: string | null; unit_price?: number } | null;
}

export interface AdminOrder {
  id: string;
  order_no: string;
  status: string;
  total_amount: number | null;
  address: { receiver?: string; phone?: string; full?: string } | null;
  notes: string | null;
  created_at: string;
  zhuli_order_items: AdminOrderItem[];
}

/**
 * 列出「待核销转账」的订单（含明细）。服务端校验 admin 权限（绕 RLS）。
 */
export async function listManualTransfers() {
  const admin = await getAdmin();
  if (!admin) return { error: "无权限，仅管理员可操作" };

  const server = createServerClient();
  const { data, error } = await server
    .from("zhuli_orders")
    .select("id, order_no, status, total_amount, address, notes, created_at, zhuli_order_items(id, quantity, unit_price, snapshot)")
    .eq("payment_intent", "manual_transfer_submitted")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) return { error: error.message };
  return { orders: (data ?? []) as AdminOrder[] };
}

/**
 * 核销转账：核实用户已转账后，把订单置为已支付（paid）。
 * 状态机：pending_payment → paid；payment_intent → manual_transfer_confirmed。
 * 微信支付接入后，此动作由支付回调替代。
 */
export async function verifyTransfer(orderId: string) {
  const admin = await getAdmin();
  if (!admin) return { error: "无权限，仅管理员可操作" };
  if (!orderId) return { error: "缺少订单" };

  const server = createServerClient();
  const { data: order, error: orderErr } = await server
    .from("zhuli_orders")
    .select("id, status, payment_intent, notes")
    .eq("id", orderId)
    .single();
  if (orderErr || !order) return { error: "订单不存在" };
  if (order.payment_intent !== "manual_transfer_submitted")
    return { error: "该订单不在待核销状态" };

  const now = new Date().toLocaleString("zh-CN");
  const prevNotes = order.notes ? `${order.notes}\n` : "";
  const { error: updErr } = await server
    .from("zhuli_orders")
    .update({
      status: "paid",
      payment_intent: "manual_transfer_confirmed",
      notes: `${prevNotes}[管理员已于 ${now} 核销转账，订单已支付]`,
    })
    .eq("id", orderId);
  if (updErr) return { error: updErr.message };
  return { ok: true };
}

/**
 * 拒付/撤回：误标记的转账可在此拒绝，恢复为待支付以重新转账。
 * 状态机：pending_payment(已标记) → 清除标记，仍回 pending_payment。
 */
export async function rejectTransfer(orderId: string) {
  const admin = await getAdmin();
  if (!admin) return { error: "无权限，仅管理员可操作" };
  if (!orderId) return { error: "缺少订单" };

  const server = createServerClient();
  const { data: order, error: orderErr } = await server
    .from("zhuli_orders")
    .select("id, status, payment_intent, notes")
    .eq("id", orderId)
    .single();
  if (orderErr || !order) return { error: "订单不存在" };
  if (order.payment_intent !== "manual_transfer_submitted")
    return { error: "该订单不在待核销状态" };

  const now = new Date().toLocaleString("zh-CN");
  const prevNotes = order.notes ? `${order.notes}\n` : "";
  const { error: updErr } = await server
    .from("zhuli_orders")
    .update({
      payment_intent: null,
      notes: `${prevNotes}[管理员已于 ${now} 拒付，待重新转账]`,
    })
    .eq("id", orderId);
  if (updErr) return { error: updErr.message };
  return { ok: true };
}