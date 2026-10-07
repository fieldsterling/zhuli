"use server";

import { createServerClient } from "@/lib/supabase";
import { getServerUser } from "@/lib/server-user";
import { adminUser } from "@/app/actions/admin";

// 生成的 Database 类型尚未包含行为表，用宽松客户端访问
type LooseClient = { from: (table: string) => any };

export type TrackInput = {
  event_type: string;
  target_type?: string;
  target_id?: string | null;
  category_code?: string | null;
  context_entity?: string | null;
  meta?: Record<string, unknown> | null;
  source?: string | null;
};

/** 各类事件的基础增权（浏览类权重低、成交类高） */
const EVENT_WEIGHT: Record<string, number> = {
  page_view: 0.5,
  category_browse: 1.5,
  product_view: 1,
  product_detail: 2,
  favorite: 4,
  add_to_cart: 5,
  search: 6,
  service_inquiry: 6,
  task_publish: 10,
  place_order: 10,
};

/** 是否属于“浏览/活跃”类（用于活跃日计数） */
const VIEW_EVENTS = new Set(["page_view", "product_view", "category_browse", "product_detail"]);
const SEARCH_EVENTS = new Set(["search", "service_inquiry"]);
const ORDER_EVENTS = new Set(["place_order", "task_publish"]);

function isoWeek(y: Date): string {
  const d = new Date(Date.UTC(y.getFullYear(), y.getMonth(), y.getDate()));
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day + 3);
  const firstThu = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const firstDay = (firstThu.getUTCDay() + 6) % 7;
  firstThu.setUTCDate(firstThu.getUTCDate() - firstDay + 3);
  const week = 1 + Math.round((d.getTime() - firstThu.getTime()) / (7 * 86400000));
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/**
 * 记录一条行为：写流水 + 更新兴趣权重（衰减+增权） + 更新日/周聚合。
 * - 已登录：完整记账（user_id 挂当前用户）
 * - 未登录：若传入 visitorId → 以匿名行（user_id 空 + visitor_id）记账，登录后合并回填
 */
export async function trackBehavior(input: TrackInput, visitorId?: string) {
  const user = await getServerUser();
  const server = createServerClient() as unknown as LooseClient;

  const { event_type, target_type, target_id, category_code, context_entity, meta, source } = input;

  // --- 1. 写流水（append-only） ---
  const row = {
    user_id: user?.id ?? null,
    visitor_id: user ? null : (visitorId ?? null),
    event_type: String(event_type ?? "").slice(0, 50),
    target_type: target_type ? String(target_type).slice(0, 40) : null,
    target_id: target_id ?? null,
    category_code: category_code ?? null,
    context_entity: context_entity ?? null,
    meta: meta ?? null,
    source: source ?? null,
  };
  // 既未登录也无 visitorId → 无可归属身份，放弃
  if (!user && !visitorId) return { ok: false, reason: "no_identity" };
  await server.from("zhuli_behavior_events").insert(row);

  if (user) await applyEventEffects(server, user.id, input);

  return { ok: true, logged_in: !!user };
}

/** 把一条事件的权重/聚合效果应用到某用户（登录记账与匿名合并共用） */
async function applyEventEffects(server: LooseClient, userId: string, e: TrackInput) {
  const { event_type, category_code, context_entity, meta } = e;
  // 兴趣权重
  const base = EVENT_WEIGHT[event_type] ?? 0;
  const deltas: Array<{ scope: string; key: string; delta: number }> = [];
  if (base > 0 && category_code) deltas.push({ scope: "category", key: String(category_code).slice(0, 40), delta: base });
  if (event_type === "search") {
    const kw = typeof meta?.keyword === "string" ? meta.keyword.trim().slice(0, 30) : "";
    if (kw) deltas.push({ scope: "keyword", key: kw, delta: EVENT_WEIGHT.search });
  }
  if ((event_type === "task_publish" || event_type === "service_inquiry") && context_entity) {
    deltas.push({ scope: "service", key: String(context_entity).slice(0, 40), delta: EVENT_WEIGHT[event_type] });
  }
  for (const d of deltas) await bumpWeight(server, userId, d.scope, d.key, d.delta);

  // 日/周聚合
  await bumpSummary(server, userId, event_type);
}

/** 匿名 → 登录合并：把同一 visitor_id 的匿名流水改挂到当前用户，并把权重/聚合重放进去。 */
export async function mergeAnonymousBehavior(visitorId: string) {
  const user = await getServerUser();
  if (!user) return { ok: false, reason: "not_logged_in" };
  if (!visitorId) return { ok: false, reason: "no_visitor" };
  const server = createServerClient() as unknown as LooseClient;

  const { data: rows } = await server
    .from("zhuli_behavior_events")
    .select("event_type, category_code, context_entity, meta")
    .is("user_id", null)
    .eq("visitor_id", visitorId)
    .limit(500);
  if (!rows || !rows.length) return { ok: true, merged: 0 };

  await server
    .from("zhuli_behavior_events")
    .update({ user_id: user.id })
    .is("user_id", null)
    .eq("visitor_id", visitorId);

  for (const r of rows) {
    await applyEventEffects(server, user.id, {
      event_type: r.event_type,
      category_code: r.category_code ?? null,
      context_entity: r.context_entity ?? null,
      meta: r.meta ?? null,
    });
  }

  return { ok: true, merged: rows.length };
}

async function bumpWeight(server: LooseClient, userId: string, scope: string, key: string, delta: number) {
  const { data } = await server
    .from("zhuli_interest_weights")
    .select("weight,last_seen")
    .eq("user_id", userId)
    .eq("scope", scope)
    .eq("key_id", key)
    .maybeSingle();
  let base = 0;
  if (data?.weight != null) {
    const days = (Date.now() - new Date(data.last_seen).getTime()) / 86400000;
    base = Number(data.weight) * Math.pow(0.9, Math.max(0, days));
  }
  const weight = Math.max(0, Number((base + delta).toFixed(2)));
  await server.from("zhuli_interest_weights").upsert(
    { user_id: userId, scope, key_id: key, weight, last_seen: new Date().toISOString() },
    { onConflict: "user_id,scope,key_id" }
  );
}

async function bumpSummary(server: LooseClient, userId: string, eventType: string) {
  const now = new Date();
  const day = now.toISOString().slice(0, 10);
  const week = isoWeek(now);
  const inc: { view_days?: number; inquiries?: number; orders?: number; disputes?: number } = {};
  if (VIEW_EVENTS.has(eventType)) inc.view_days = 1;
  if (SEARCH_EVENTS.has(eventType)) inc.inquiries = 1;
  if (ORDER_EVENTS.has(eventType)) inc.orders = 1;
  if (eventType === "dispute") inc.disputes = 1;
  if (!Object.keys(inc).length) return;

  for (const [pt, pv] of [
    ["day", day],
    ["week", week],
  ] as const) {
    const row: Record<string, unknown> = { user_id: userId, period_type: pt, period_value: pv, ...inc };
    await server
      .from("zhuli_behavior_summary")
      .upsert(row, { onConflict: "user_id,period_type,period_value" });
  }
}

/** 管理员：从订单+行为回填 zhuli_user_profiles 的系统只读指标（评分/订单/销售额/价格带/最后活跃） */
export async function adminRunBehaviorReport() {
  const admin = await adminUser();
  if (!admin) return { error: "无管理员权限" };
  const server = createServerClient() as unknown as LooseClient;

  // 订单财务聚合
  const { data: orders } = await server.from("zhuli_orders").select("user_id, total_amount, status");
  const fin: Record<string, { orders: number; sales: number }> = {};
  for (const o of orders ?? []) {
    const f = (fin[o.user_id] ??= { orders: 0, sales: 0 });
    f.orders += 1;
    if (!["cancelled", "refunded"].includes(o.status)) f.sales += Number(o.total_amount ?? 0);
  }

  // 最后活跃（取最近事件）
  const { data: events } = await server
    .from("zhuli_behavior_events")
    .select("user_id, created_at")
    .order("created_at", { ascending: false })
    .limit(3000);
  const lastActive: Record<string, string> = {};
  for (const e of events ?? []) if (!lastActive[e.user_id]) lastActive[e.user_id] = e.created_at;

  for (const [uid, f] of Object.entries(fin)) {
    const avg = f.orders ? Number((f.sales / f.orders).toFixed(2)) : null;
    const band =
      avg == null
        ? null
        : avg < 1000
        ? "低端"
        : avg < 5000
        ? "中端"
        : avg < 20000
        ? "中高端"
        : avg < 50000
        ? "高端"
        : "顶级";
    await server.from("zhuli_user_profiles").upsert(
      {
        user_id: uid,
        total_orders: f.orders,
        total_sales: Number(f.sales.toFixed(2)),
        avg_order_value: avg,
        price_band: band,
        last_active_at: lastActive[uid] ?? null,
      },
      { onConflict: "user_id" }
    );
  }
  return { ok: true, updated: Object.keys(fin).length };
}