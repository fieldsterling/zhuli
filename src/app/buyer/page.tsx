"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase";
import { useAuthStore } from "@/store/auth";

const inputCls =
  "w-full rounded-xl border border-black/10 bg-white/60 px-3 py-2 text-sm outline-none focus:border-primary";

const TASK_STATUS: Record<string, string> = {
  open: "待接单",
  quoted: "已报价",
  confirmed: "已确认",
  in_progress: "进行中",
  delivered: "已送达",
  completed: "已完成",
  cancelled: "已取消",
  settled: "已结算",
};

export default function BuyerDashboardPage() {
  const router = useRouter();
  const supabase = createBrowserClient();
  const user = useAuthStore((s) => s.user);
  const [tasks, setTasks] = useState<Array<Record<string, any>>>([]);
  const [loading, setLoading] = useState(true);
  // 我的报价：按 task_id 索引，只含本人报价（RLS 硬隔离，读不到别家）
  const [myQuotes, setMyQuotes] = useState<Record<string, Record<string, any>>>({});
  const [openId, setOpenId] = useState<string | null>(null);
  const [form, setForm] = useState({ price: "", deliveryDays: "", specSummary: "", feeNote: "", quoteDeposit: "" });
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    if (!user) return;
    const sb = supabase as unknown as { from: (t: string) => any };
    const { data } = await sb
      .from("zhuli_tasks")
      .select(
        "id, type, description, budget_min, budget_max, status, created_at, demand_no, tier, category, purity, weight_min, weight_max, craft, size_spec, quantity, deadline, accept_alternative, deposit"
      )
      .eq("type", "find")
      .in("status", ["open", "quoted"])
      .order("created_at", { ascending: false })
      .limit(100);
    setTasks(data ?? []);
    const { data: mine } = await sb
      .from("zhuli_task_quotes")
      .select("id, task_id, price, status, delivery_days")
      .eq("buyer_id", user.id);
    const map: Record<string, Record<string, any>> = {};
    for (const q of mine ?? []) map[q.task_id] = q;
    setMyQuotes(map);
    setLoading(false);
  }, [supabase, user]);

  useEffect(() => {
    load();
  }, [load]);

  const submitQuote = async (task: Record<string, any>) => {
    if (!user) return;
    const price = Number(form.price);
    if (!price || price <= 0) {
      setMsg("请填写报价金额");
      return;
    }
    setSubmitting(true);
    setMsg("");
    const sb = supabase as unknown as { from: (t: string) => any };
    // 信用分属于平台侧数据（zhuli_user_profiles，仅管理员可读），由平台回填，档口不自报
    const { error } = await sb.from("zhuli_task_quotes").insert({
      task_id: task.id,
      buyer_id: user.id,
      price,
      delivery_days: form.deliveryDays ? Number(form.deliveryDays) : null,
      quote_deposit: form.quoteDeposit ? Number(form.quoteDeposit) : null,
      spec_summary: form.specSummary.trim() || null,
      fee_note: form.feeNote.trim() || null,
      status: "pending",
      message: "",
    });
    setSubmitting(false);
    if (error) {
      setMsg("报价失败：" + error.message);
      return;
    }
    setForm({ price: "", deliveryDays: "", specSummary: "", feeNote: "", quoteDeposit: "" });
    setOpenId(null);
    setMsg("报价已提交，仅你与需求方可查看");
    load();
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center px-5 pt-24">
        <p className="text-sm text-muted">请先登录</p>
        <button onClick={() => router.push("/login")} className="mt-4 rounded-xl bg-primary px-6 py-2.5 font-medium text-primary-foreground">
          去登录
        </button>
      </div>
    );
  }

  return (
    <div className="px-5 pt-8 pb-16">
      <button onClick={() => router.back()} className="text-sm text-muted">← 返回</button>
      <h1 className="mt-2 text-xl font-semibold">找货报价台</h1>
      <p className="mt-1 text-sm text-muted">
        公开找货需求 {tasks.length} 条 · 报价仅你与需求方可见
      </p>
      {msg && <p className="mt-2 text-sm text-primary">{msg}</p>}

      <div className="mt-5 space-y-3">
        {loading ? (
          <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-black/5" />)}</div>
        ) : tasks.length === 0 ? (
          <div className="glass rounded-2xl p-8 text-center">
            <p className="text-sm text-muted">暂无公开找货需求</p>
          </div>
        ) : (
          tasks.map((t) => {
            const mine = myQuotes[t.id];
            const isBatch = t.tier === "b";
            const specLine = [t.category, t.purity, t.craft, t.size_spec].filter(Boolean).join(" · ");
            return (
              <div key={t.id} className="glass rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    {isBatch ? "批量采购" : "单件定制"}
                  </span>
                  <span className="text-xs text-muted">{TASK_STATUS[t.status] ?? t.status}</span>
                </div>
                <p className="mt-2 text-sm">{t.description || "（无描述）"}</p>
                {specLine && (
                  <p className="mt-1 text-xs text-muted">
                    {specLine}
                    {t.weight_min != null || t.weight_max != null
                      ? `　${t.weight_min ?? "?"}-${t.weight_max ?? "?"}g`
                      : ""}
                    {t.quantity ? `　×${t.quantity}` : ""}
                    {t.deadline ? `　交期 ${t.deadline}` : ""}
                  </p>
                )}
                {(t.budget_min != null || t.budget_max != null) && (
                  <p className="mt-1 text-xs text-muted">
                    预算 ¥{t.budget_min ?? "?"}~{t.budget_max ?? "?"}
                    {t.accept_alternative ? " · 接受同系列替代款" : ""}
                  </p>
                )}
                <p className="mt-2 text-[11px] text-muted">
                  {t.demand_no ? `${t.demand_no} · ` : ""}
                  {new Date(t.created_at).toLocaleString("zh-CN")}
                </p>

                {mine ? (
                  <div className="mt-3 flex items-center justify-between rounded-xl bg-black/5 px-3 py-2">
                    <span className="text-xs text-muted">
                      我的报价 ¥{Number(mine.price).toLocaleString()}
                      {mine.delivery_days ? ` · ${mine.delivery_days}天` : ""}
                    </span>
                    {mine.status === "accepted" ? (
                      <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[11px] font-medium text-gold">
                        已中标
                      </span>
                    ) : (
                      <span className="text-[11px] text-muted">已报价</span>
                    )}
                  </div>
                ) : openId === t.id ? (
                  <div className="mt-3 space-y-2 rounded-xl bg-black/[0.03] p-3">
                    <input
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: e.target.value })}
                      type="number"
                      inputMode="decimal"
                      placeholder={isBatch ? "报价单价 ¥/件" : "报价金额 ¥"}
                      className={inputCls}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        value={form.deliveryDays}
                        onChange={(e) => setForm({ ...form, deliveryDays: e.target.value })}
                        type="number"
                        inputMode="numeric"
                        placeholder="交期（天）"
                        className={inputCls}
                      />
                      <input
                        value={form.quoteDeposit}
                        onChange={(e) => setForm({ ...form, quoteDeposit: e.target.value })}
                        type="number"
                        inputMode="numeric"
                        placeholder="报价保证金 ¥"
                        className={inputCls}
                      />
                    </div>
                    <input
                      value={form.specSummary}
                      onChange={(e) => setForm({ ...form, specSummary: e.target.value })}
                      placeholder="供货规格摘要（成色/克重/工艺）"
                      className={inputCls}
                    />
                    <input
                      value={form.feeNote}
                      onChange={(e) => setForm({ ...form, feeNote: e.target.value })}
                      placeholder="费用说明（含工费/含税/是否包料）"
                      className={inputCls}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setOpenId(null);
                          setMsg("");
                        }}
                        className="flex-1 rounded-xl border border-black/10 py-2 text-xs"
                      >
                        取消
                      </button>
                      <button
                        onClick={() => submitQuote(t)}
                        disabled={submitting}
                        className="flex-1 rounded-xl bg-primary py-2 text-xs font-medium text-primary-foreground disabled:opacity-50"
                      >
                        {submitting ? "提交中…" : "提交报价"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setOpenId(t.id);
                      setMsg("");
                    }}
                    className="mt-3 w-full rounded-xl border border-gold/40 py-2 text-xs font-medium text-gold"
                  >
                    提交报价
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}