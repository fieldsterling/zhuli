"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase";
import type { Database } from "@/types/supabase";
import { useAuthStore } from "@/store/auth";

type TaskType = "find" | "errand";

interface Props {
  type: TaskType;
  title: string;
  subtitle: string;
  placeholder: string;
  /** 是否展示预算区间（找货需要，跑腿不需要） */
  showBudget?: boolean;
  /** 档位默认值（场景入口预填，如「同行调货」默认批量采购） */
  defaultTier?: "c" | "b";
  accent: string;
}

// 027 迁移新增的结构化需求字段尚未进入生成的 types，这里做局部扩展
type TaskRow = Database["public"]["Tables"]["zhuli_tasks"]["Row"] & {
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

const CATEGORY_OPTIONS = ["手镯", "项链", "戒指", "吊坠", "手链", "耳饰", "手串", "其他"];
const PURITY_OPTIONS = ["足金999", "足金9999", "18K金", "铂金950", "925银", "其他"];
const CRAFT_OPTIONS = ["古法金", "3D硬金", "5G黄金", "车花", "镶嵌", "素金", "其他"];

type SpecState = {
  tier: "c" | "b";
  category: string;
  purity: string;
  weightMin: string;
  weightMax: string;
  craft: string;
  sizeSpec: string;
  quantity: string;
  deadline: string;
  acceptAlt: boolean;
  deposit: string;
};

const EMPTY_SPEC: SpecState = {
  tier: "c",
  category: "",
  purity: "",
  weightMin: "",
  weightMax: "",
  craft: "",
  sizeSpec: "",
  quantity: "",
  deadline: "",
  acceptAlt: false,
  deposit: "",
};

const selectCls =
  "w-full rounded-xl border border-black/10 bg-white/60 px-3 py-2.5 text-sm outline-none focus:border-primary";

const statusLabels: Record<string, string> = {
  open: "待接单",
  quoted: "待报价",
  confirmed: "已确认",
  in_progress: "进行中",
  completed: "已完成",
  settled: "已结算",
};

const statusColors: Record<string, string> = {
  open: "bg-black/5 text-foreground",
  quoted: "bg-gold/10 text-gold",
  confirmed: "bg-black/5 text-foreground",
  in_progress: "bg-primary/10 text-primary",
  completed: "bg-black/5 text-foreground",
  settled: "bg-black/5 text-muted",
};

export function TaskServicePage({ type, title, subtitle, placeholder, showBudget, defaultTier, accent }: Props) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const supabase = createBrowserClient();

  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);

  const [desc, setDesc] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [commission, setCommission] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");
  // 找货结构化字段（跑腿不使用）
  const initialSpec: SpecState = { ...EMPTY_SPEC, tier: defaultTier ?? "c" };
  const [spec, setSpec] = useState<SpecState>(initialSpec);
  const setField = <K extends keyof SpecState>(k: K, v: SpecState[K]) =>
    setSpec((s) => ({ ...s, [k]: v }));

  const isFind = type === "find";

  useEffect(() => {
    if (!user) return;
    let active = true;
    setLoadingTasks(true);
    supabase
      .from("zhuli_tasks")
      .select("*")
      .eq("type", type)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data, error }) => {
        if (!active) return;
        if (!error) setTasks((data ?? []) as TaskRow[]);
        setLoadingTasks(false);
      });
    return () => {
      active = false;
    };
  }, [supabase, user, type]);

  const submit = async () => {
    setMsg("");
    if (!user) {
      router.push("/login");
      return;
    }
    const text = desc.trim();
    if (!text) {
      setMsg("请填写需求描述");
      return;
    }
    if (isFind && !spec.category) {
      setMsg("请选择品类");
      return;
    }
    setSubmitting(true);
    // 生成类型尚缺 referrer_id，用宽松访问读取当前用户来源推广者
    let referrerId: unknown = null;
    const { data: me } = await (supabase as unknown as {
      from: (t: string) => any;
    })
      .from("zhuli_users")
      .select("referrer_id")
      .eq("id", user.id)
      .maybeSingle();
    referrerId = me?.referrer_id ?? null;
    const payload: any = {
      user_id: user.id,
      type,
      description: text,
      budget_min: showBudget && budgetMin ? Number(budgetMin) : null,
      budget_max: showBudget && budgetMax ? Number(budgetMax) : null,
      commission: commission ? Number(commission) : null,
    };
    payload.referrer_id = referrerId;
    if (isFind) {
      payload.tier = spec.tier;
      payload.category = spec.category || null;
      payload.purity = spec.purity || null;
      payload.weight_min = spec.weightMin ? Number(spec.weightMin) : null;
      payload.weight_max = spec.weightMax ? Number(spec.weightMax) : null;
      payload.craft = spec.craft || null;
      payload.size_spec = spec.sizeSpec.trim() || null;
      payload.quantity = spec.quantity ? Number(spec.quantity) : 1;
      payload.deadline = spec.deadline || null;
      payload.accept_alternative = spec.acceptAlt;
      payload.deposit = spec.deposit ? Number(spec.deposit) : null;
    }
    const { error } = await (supabase as unknown as {
      from: (t: string) => any;
    })
      .from("zhuli_tasks")
      .insert(payload)
      .select()
      .single();
    setSubmitting(false);
    if (error) {
      setMsg("发布失败：" + error.message);
      return;
    }
    // 行为记账：发布找货/跑腿需求
    import("@/lib/track").then(({ track }) =>
      track({
        event_type: "task_publish",
        target_type: "task",
        context_entity: type,
        meta: { desc: text.slice(0, 30) },
      })
    );
    setDesc("");
    setBudgetMin("");
    setBudgetMax("");
    setCommission("");
    setSpec(initialSpec);
    setMsg("发布成功");
    // 刷新列表
    const { data } = await supabase
      .from("zhuli_tasks")
      .select("*")
      .eq("type", type)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) setTasks(data as TaskRow[]);
  };

  return (
    <div className="min-h-screen px-5 pt-6 pb-24">
      {/* 顶栏 */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="glass flex h-9 w-9 items-center justify-center rounded-full"
          aria-label="返回"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-xl font-semibold">{title}</h1>
          <p className="text-xs text-muted">{subtitle}</p>
        </div>
      </div>

      {/* 登录提示 */}
      {!user && (
        <div className="glass mt-6 flex items-center justify-between rounded-2xl p-4">
          <p className="text-sm text-muted">登录后即可发布{title}需求</p>
          <button
            onClick={() => router.push("/login")}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            去登录
          </button>
        </div>
      )}

      {/* 发布表单 */}
      {user && (
        <form
          className="glass mt-6 space-y-3 rounded-2xl p-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <p className="text-sm font-medium">发布{title}需求</p>
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder={placeholder}
            rows={3}
            className="w-full resize-none rounded-xl border border-black/10 bg-white/60 p-3 text-sm outline-none focus:border-primary"
          />
          {isFind && (
            <div className="space-y-3 rounded-xl bg-black/[0.03] p-3">
              {/* 档位：C端单件定制 / B端批量采购，两条流程分开 */}
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { key: "c", label: "单件定制", hint: "C端 · 自己戴" },
                    { key: "b", label: "批量采购", hint: "B端 · 备货/直播" },
                  ] as const
                ).map((o) => (
                  <button
                    key={o.key}
                    type="button"
                    onClick={() => setField("tier", o.key)}
                    className={`rounded-xl border px-3 py-2 text-left transition-colors ${
                      spec.tier === o.key
                        ? "border-primary bg-primary/5"
                        : "border-black/10 bg-white/60"
                    }`}
                  >
                    <span className="block text-sm font-medium">{o.label}</span>
                    <span className="mt-0.5 block text-[11px] text-muted">{o.hint}</span>
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <select
                  value={spec.category}
                  onChange={(e) => setField("category", e.target.value)}
                  className={selectCls}
                >
                  <option value="">品类 *</option>
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <select
                  value={spec.purity}
                  onChange={(e) => setField("purity", e.target.value)}
                  className={selectCls}
                >
                  <option value="">成色</option>
                  {PURITY_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <input
                  value={spec.weightMin}
                  onChange={(e) => setField("weightMin", e.target.value)}
                  type="number"
                  inputMode="decimal"
                  placeholder="克重下限 g"
                  className={selectCls}
                />
                <input
                  value={spec.weightMax}
                  onChange={(e) => setField("weightMax", e.target.value)}
                  type="number"
                  inputMode="decimal"
                  placeholder="克重上限 g"
                  className={selectCls}
                />
                <select
                  value={spec.craft}
                  onChange={(e) => setField("craft", e.target.value)}
                  className={selectCls}
                >
                  <option value="">工艺</option>
                  {CRAFT_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <input
                  value={spec.sizeSpec}
                  onChange={(e) => setField("sizeSpec", e.target.value)}
                  placeholder="圈口 / 链长 / 尺寸"
                  className={selectCls}
                />
                <input
                  value={spec.quantity}
                  onChange={(e) => setField("quantity", e.target.value)}
                  type="number"
                  inputMode="numeric"
                  placeholder={spec.tier === "b" ? "数量（件）" : "数量（默认 1）"}
                  className={selectCls}
                />
                <input
                  value={spec.deadline}
                  onChange={(e) => setField("deadline", e.target.value)}
                  type="date"
                  placeholder="期望交期"
                  className={selectCls}
                />
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={spec.acceptAlt}
                  onChange={(e) => setField("acceptAlt", e.target.checked)}
                  className="h-4 w-4 accent-[#b08d4a]"
                />
                接受同系列替代款
              </label>

              <input
                value={spec.deposit}
                onChange={(e) => setField("deposit", e.target.value)}
                type="number"
                inputMode="numeric"
                placeholder="需求保证金 ¥（选填，过滤无效询价）"
                className={selectCls}
              />
            </div>
          )}
          {showBudget && (
            <div className="grid grid-cols-2 gap-3">
              <input
                value={budgetMin}
                onChange={(e) => setBudgetMin(e.target.value)}
                type="number"
                inputMode="numeric"
                placeholder="预算下限 ¥"
                className="w-full rounded-xl border border-black/10 bg-white/60 px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
              <input
                value={budgetMax}
                onChange={(e) => setBudgetMax(e.target.value)}
                type="number"
                inputMode="numeric"
                placeholder="预算上限 ¥"
                className="w-full rounded-xl border border-black/10 bg-white/60 px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
            </div>
          )}
          <input
            value={commission}
            onChange={(e) => setCommission(e.target.value)}
            type="number"
            inputMode="numeric"
            placeholder="悬赏跑腿费 ¥（选填）"
            className="w-full rounded-xl border border-black/10 bg-white/60 px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl py-3 text-sm font-medium text-white transition-opacity disabled:opacity-50"
            style={{ background: accent }}
          >
            {submitting ? "发布中…" : `发布${title}`}
          </button>
          {msg && <p className="text-center text-sm text-primary">{msg}</p>}
        </form>
      )}

      {/* 我的任务 */}
      <section className="mt-8">
        <h2 className="text-base font-semibold">我的{title}</h2>
        {loadingTasks ? (
          <div className="mt-3 space-y-3">
            {[0, 1].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl bg-black/5" />
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <p className="mt-6 text-center text-sm text-muted">还没有{title}记录</p>
        ) : (
          <div className="mt-3 space-y-3">
            {tasks.map((t) => (
              <div key={t.id} className="glass rounded-2xl p-4">
                {t.demand_no && (
                  <p className="mb-1 text-[11px] font-medium text-gold">{t.demand_no}</p>
                )}
                <div className="flex items-start justify-between gap-3">
                  <p className="flex-1 text-sm leading-snug text-foreground">
                    {t.description || "（无描述）"}
                  </p>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                      statusColors[t.status] ?? "bg-black/5 text-foreground"
                    }`}
                  >
                    {statusLabels[t.status] ?? t.status}
                  </span>
                </div>
                {t.type === "find" && t.category && (
                  <p className="mt-2 text-xs text-muted">
                    {[t.category, t.purity, t.craft, t.size_spec].filter(Boolean).join(" · ")}
                    {t.weight_min != null || t.weight_max != null
                      ? `　${t.weight_min ?? "?"}-${t.weight_max ?? "?"}g`
                      : ""}
                    {t.quantity ? `　×${t.quantity}` : ""}
                    {t.deadline ? `　交期 ${t.deadline}` : ""}
                  </p>
                )}
                {(t.budget_min != null || t.budget_max != null) && (
                  <p className="mt-2 text-xs text-muted">
                    预算：¥{Number(t.budget_min ?? 0).toLocaleString()} - ¥
                    {Number(t.budget_max ?? 0).toLocaleString()}
                  </p>
                )}
                {t.commission != null && (
                  <p className="mt-1 text-xs text-gold">悬赏：¥{Number(t.commission).toLocaleString()}</p>
                )}
                <p className="mt-2 text-[11px] text-muted">
                  {new Date(t.created_at).toLocaleString("zh-CN", { hour12: false })}
                </p>
                {t.type === "find" && (
                  <button
                    onClick={() => router.push(`/demand/${t.id}`)}
                    className="mt-3 w-full rounded-xl border border-gold/40 py-2 text-xs font-medium text-gold"
                  >
                    查看为我匹配的方案
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}