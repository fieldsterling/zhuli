"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase";
import { useAuthStore } from "@/store/auth";

const TYPES = [
  { key: "find", label: "找货", tint: "#b08d4a" },
  { key: "proxy", label: "代购", tint: "#8a5a33" },
  { key: "qc", label: "质检", tint: "#6b8e4e" },
  { key: "errand", label: "跑腿", tint: "#3a6ea5" },
] as const;

const TASK_STATUS: Record<string, string> = {
  open: "待接单",
  quoted: "已报价",
  confirmed: "已确认",
  in_progress: "进行中",
  completed: "已完成",
  settled: "已结算",
};

type Task = {
  id: string;
  type: string;
  description?: string | null;
  budget_min?: number | null;
  budget_max?: number | null;
  commission?: number | null;
  status: string;
  created_at: string;
};

export default function ServicesRecordsPage() {
  const router = useRouter();
  const supabase = createBrowserClient();
  const user = useAuthStore((s) => s.user);
  const [byType, setByType] = useState<Record<string, Task[]>>({});
  const [active, setActive] = useState<string>("find");
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("zhuli_tasks")
      .select("id, type, description, budget_min, budget_max, commission, status, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(200);
    const grouped: Record<string, Task[]> = {};
    for (const t of data ?? []) {
      (grouped[t.type] = grouped[t.type] ?? []).push(t);
    }
    setByType(grouped);
    setLoading(false);
  }, [supabase, user]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

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

  const counts: Record<string, number> = {};
  for (const t of TYPES) counts[t.key] = (byType[t.key] ?? []).length;

  return (
    <div className="px-5 pt-8 pb-16">
      <button onClick={() => router.back()} className="text-sm text-muted">← 返回</button>
      <h1 className="mt-2 text-xl font-semibold">我的服务</h1>

      {/* 分类型标签 */}
      <div className="mt-4 flex flex-wrap gap-2">
        {TYPES.map((t) => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            className={
              active === t.key
                ? "rounded-lg px-3 py-1.5 text-sm font-medium text-white"
                : "rounded-lg bg-black/5 px-3 py-1.5 text-sm font-medium"
            }
            style={active === t.key ? { background: t.tint } : undefined}
          >
            {t.label} · {counts[t.key] ?? 0}
          </button>
        ))}
      </div>

      {/* 选中类型的记录 */}
      <div className="mt-5 space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl bg-black/5" />
            ))}
          </div>
        ) : (byType[active] ?? []).length === 0 ? (
          <div className="glass rounded-2xl p-8 text-center">
            <p className="text-sm text-muted">暂无{TYPES.find((t) => t.key === active)?.label}记录</p>
          </div>
        ) : (
          (byType[active] ?? []).map((t) => {
            const tint = TYPES.find((x) => x.key === t.type)?.tint;
            return (
              <div key={t.id} className="glass rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold text-white" style={{ background: tint }}>
                    {TYPES.find((x) => x.key === t.type)?.label ?? t.type}
                  </span>
                  <span className="rounded-full bg-black/5 px-2 py-0.5 text-xs">{TASK_STATUS[t.status] ?? t.status}</span>
                </div>
                <p className="mt-2 text-sm">{t.description || "（无描述）"}</p>
                {(t.budget_min != null || t.commission != null) && (
                  <p className="mt-1 text-xs text-muted">
                    {t.budget_min != null ? `预算 ¥${t.budget_min}~${t.budget_max ?? "?"}` : ""}
                    {t.commission != null ? ` · 佣金 ¥${t.commission}` : ""}
                  </p>
                )}
                <p className="mt-2 text-xs text-muted">{new Date(t.created_at).toLocaleString("zh-CN")}</p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}