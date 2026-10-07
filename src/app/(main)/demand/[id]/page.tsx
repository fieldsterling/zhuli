"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase";
import { useAuthStore } from "@/store/auth";
import type { Database } from "@/types/supabase";

// 027 迁移新增字段尚未进入生成的 types，这里做局部扩展
type Demand = Database["public"]["Tables"]["zhuli_tasks"]["Row"] & {
  demand_no?: string | null;
  tier?: string | null;
  category?: string | null;
  purity?: string | null;
  weight_min?: number | null;
  weight_max?: number | null;
  craft?: string | null;
  size_spec?: string | null;
  quantity?: number | null;
  deadline?: string | null;
  accept_alternative?: boolean | null;
  deposit?: number | null;
};

type Quote = {
  id: string;
  buyer_id: string;
  price: number;
  status: string;
  created_at: string;
  alias?: string | null;
  credit_score?: number | null;
  delivery_days?: number | null;
  quote_deposit?: number | null;
  spec_summary?: string | null;
  fee_note?: string | null;
  is_platform_pick?: boolean | null;
};

const num = (v?: number | null) => (v != null ? Number(v).toLocaleString("zh-CN") : "—");
// 匿名代号：内部存「档口A」，对外统一呈现为「方案 A」，不暴露来源身份
const planCode = (alias?: string | null) => `方案 ${(alias ?? "").replace(/^档口/, "").trim() || "—"}`;

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="shrink-0 text-muted">{label}</span>
      <span className="min-w-0 flex-1 text-foreground">{value || "—"}</span>
    </div>
  );
}

export default function DemandDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createBrowserClient();
  const user = useAuthStore((s) => s.user);

  const [demand, setDemand] = useState<Demand | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    if (!id || !user) return;
    const loose = supabase as unknown as { from: (t: string) => any };
    const { data: t } = await loose.from("zhuli_tasks").select("*").eq("id", id).maybeSingle();
    if (!t || t.user_id !== user.id) {
      setDenied(true);
      setLoading(false);
      return;
    }
    setDemand(t as Demand);
    // 打分排序（价格50%+交期25%+信用25%）与风控降权全部在服务端函数内完成，
    // 前端只拿到中性投影：无分值、无权重、无风控标记、无排名数字
    const rpc = supabase as unknown as {
      rpc: (
        fn: string,
        args: Record<string, unknown>
      ) => Promise<{ data: Quote[] | null; error: { message: string } | null }>;
    };
    const { data: qs, error: qe } = await rpc.rpc("zhuli_rank_demand_quotes", { p_task_id: id });
    if (qe) setErr("方案加载失败：" + qe.message);
    setQuotes(qs ?? []);
    setLoading(false);
  }, [id, supabase, user]);

  useEffect(() => {
    load();
  }, [load]);

  const choose = async (q: Quote) => {
    if (!demand) return;
    setWorking(true);
    setErr("");
    const loose = supabase as unknown as { from: (t: string) => any };
    const { error: e1 } = await loose
      .from("zhuli_task_quotes")
      .update({ status: "accepted" })
      .eq("id", q.id);
    if (e1) {
      setErr("选定失败：" + e1.message);
      setWorking(false);
      return;
    }
    await loose.from("zhuli_task_quotes").update({ status: "rejected" }).eq("task_id", demand.id).neq("id", q.id);
    const { error: e3 } = await loose
      .from("zhuli_tasks")
      .update({ status: "confirmed", buyer_id: q.buyer_id })
      .eq("id", demand.id);
    setWorking(false);
    if (e3) {
      setErr("更新需求状态失败：" + e3.message);
      return;
    }
    setConfirmId(null);
    load();
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center px-5 pt-24">
        <p className="text-sm text-muted">请先登录后查看</p>
        <button
          onClick={() => router.push("/login")}
          className="mt-4 rounded-xl bg-primary px-6 py-2.5 font-medium text-primary-foreground"
        >
          去登录
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="px-5 pt-8">
        <div className="h-6 w-24 animate-pulse rounded bg-black/8" />
        <div className="mt-4 h-36 animate-pulse rounded-2xl bg-black/5" />
        <div className="mt-3 h-28 animate-pulse rounded-2xl bg-black/5" />
      </div>
    );
  }

  if (denied || !demand) {
    return (
      <div className="flex flex-col items-center px-5 pt-24">
        <p className="text-sm text-muted">需求不存在或无权限查看</p>
        <button
          onClick={() => router.back()}
          className="mt-4 rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground"
        >
          返回
        </button>
      </div>
    );
  }

  const isBatch = demand.tier === "b";
  const sizeText =
    demand.weight_min != null || demand.weight_max != null
      ? `${demand.weight_min ?? "?"}-${demand.weight_max ?? "?"} g`
      : null;

  return (
    <div className="px-5 pt-8 pb-24">
      <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-muted">
        <ChevronLeft className="h-4 w-4" /> 返回
      </button>

      {/* 需求摘要 */}
      <section className="glass mt-3 rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-medium text-gold">{demand.demand_no ?? "找货需求"}</p>
          <span className="rounded-full bg-black/5 px-2 py-0.5 text-[11px]">
            {isBatch ? "批量采购" : "单件定制"}
          </span>
        </div>
        <p className="mt-2 text-sm leading-relaxed">{demand.description || "（无描述）"}</p>
        <div className="mt-3 grid grid-cols-2 gap-y-2 text-xs">
          <Row label="品类" value={demand.category} />
          <Row label="成色" value={demand.purity} />
          <Row label="克重" value={sizeText} />
          <Row label="工艺" value={demand.craft} />
          <Row label="规格" value={demand.size_spec} />
          <Row label="数量" value={demand.quantity ? `${demand.quantity} 件` : null} />
          <Row label="交期" value={demand.deadline} />
          <Row label="接受替代款" value={demand.accept_alternative ? "是" : "否"} />
        </div>
        {(demand.budget_min != null || demand.budget_max != null) && (
          <p className="mt-3 text-xs text-muted">
            预算：¥{num(demand.budget_min)} ~ ¥{num(demand.budget_max)}
          </p>
        )}
        {demand.deposit != null && (
          <p className="mt-1 text-xs text-muted">需求保证金：¥{num(demand.deposit)}</p>
        )}
      </section>

      {/* 方案列表 */}
      <section className="mt-6">
        <h2 className="text-base font-semibold">为你匹配的 {quotes.length} 个方案</h2>
        <p className="mt-1 text-xs text-muted">
          方案来自平台匹配的供货档口，仅有代号；选定后平台安排对接与验货
        </p>

        {quotes.length === 0 ? (
          <div className="glass mt-3 rounded-2xl p-8 text-center">
            <p className="text-sm text-muted">正在为你匹配，方案会陆续送达</p>
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            {quotes.map((q) => {
              const accepted = q.status === "accepted";
              return (
                <div key={q.id} className="glass rounded-2xl p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                        {planCode(q.alias)}
                      </span>
                      {accepted && (
                        <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[11px] font-medium text-gold">
                          已选定
                        </span>
                      )}
                      {!accepted && q.is_platform_pick && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                          优选
                        </span>
                      )}
                    </div>
                    <span className="text-lg font-semibold text-gold">
                      ¥{num(q.price)}
                      {isBatch ? <span className="text-xs font-normal text-muted"> /件</span> : null}
                    </span>
                  </div>

                  {q.spec_summary && <p className="mt-2 text-xs text-foreground">{q.spec_summary}</p>}
                  {q.fee_note && <p className="mt-1 text-[11px] text-muted">{q.fee_note}</p>}

                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted">
                    {q.credit_score != null && <span>信用分 {q.credit_score}</span>}
                    <span>交期 {q.delivery_days != null ? `${q.delivery_days} 天` : "—"}</span>
                    {q.quote_deposit != null && <span>保证金 ¥{num(q.quote_deposit)}</span>}
                  </div>

                  {isBatch && demand.quantity ? (
                    <p className="mt-2 text-[11px] text-muted">
                      {demand.quantity} 件约 ¥{num(Number(q.price) * Number(demand.quantity))}
                    </p>
                  ) : null}

                  {!accepted && demand.status !== "confirmed" && (
                    confirmId === q.id ? (
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => setConfirmId(null)}
                          className="flex-1 rounded-xl border border-black/10 py-2 text-xs"
                        >
                          再想想
                        </button>
                        <button
                          onClick={() => choose(q)}
                          disabled={working}
                          className="flex-1 rounded-xl bg-primary py-2 text-xs font-medium text-primary-foreground disabled:opacity-50"
                        >
                          {working ? "处理中…" : "确认选定"}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmId(q.id)}
                        className="mt-3 w-full rounded-xl border border-gold/40 py-2 text-xs font-medium text-gold"
                      >
                        选定该方案
                      </button>
                    )
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {err && <p className="mt-4 text-sm text-danger">{err}</p>}
    </div>
  );
}
