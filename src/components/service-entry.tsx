"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import {
  CUSTOMER_SERVICES,
  INDUSTRY_ROLES,
  OTHER_INTENTS,
  ROLE_TO_ENTITY_CODE,
  ENTRY_DRAFT_KEY,
} from "@/lib/industry";
import type { RoleSupplies } from "@/lib/catalog-categories";
import { saveMyAnswer } from "@/app/actions/myself-answer";
import type { SaveEntryInput } from "@/app/actions/myself-answer";

export type EntryRow = Record<string, any> | null;

type Step = "q1" | "need" | "offer" | "offerCats" | "done";

interface Props {
  initial: EntryRow;
  /** offer 分支的内存对象：按主体 code 分组的供应能力 */
  supplies: Record<string, RoleSupplies>;
  /** card = 服务页的紧凑卡；page = 「我的偏好」整页（始终可编辑） */
  mode?: "card" | "page";
  returnTo?: string;
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3.5 py-2 text-sm transition-all ${
        active
          ? "border-gold/70 bg-gold/10 font-medium text-gold"
          : "border-black/10 bg-white/60 text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

export function ServiceEntry({ initial, supplies, mode = "card", returnTo = "/services" }: Props) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [step, setStep] = useState<Step>(() => {
    if (mode === "page") {
      if (initial?.branch === "need") return "need";
      if (initial?.branch === "offer") return "offerCats";
      return "q1";
    }
    return initial?.done ? "done" : "q1";
  });
  const [branch, setBranch] = useState<"need" | "offer">(initial?.branch === "offer" ? "offer" : "need");
  const [serviceIntents, setServiceIntents] = useState<string[]>(initial?.service_intents ?? []);
  const [otherIntents, setOtherIntents] = useState<string[]>(initial?.other_intents ?? []);
  const [role, setRole] = useState<string>(initial?.industry_role ?? "");
  const [offerCapIds, setOfferCapIds] = useState<string[]>(initial?.offer_capability_ids ?? []);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [doneAs, setDoneAs] = useState<"need" | "offer" | null>(null);

  // 按所选角色，展示该角色能提供的「供应能力」（来自 zhuli_supply_capabilities），分「产品」/「服务」两组
  const roleSupplies = useMemo(() => {
    const code = ROLE_TO_ENTITY_CODE[role] ?? "";
    return supplies[code] ?? { entity_code: code, products: [], services: [] };
  }, [supplies, role]);
  const offerOptions = useMemo(
    () => [
      { label: "产品", items: roleSupplies.products },
      { label: "服务", items: roleSupplies.services },
    ],
    [roleSupplies]
  );

  // 「我的偏好」整页：把已有数据预填后，若未登录引导登录
  useEffect(() => {
    if (mode === "page" && !user && !localStorage.getItem(ENTRY_DRAFT_KEY)) {
      // 空跑
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggle(arr: string[], set: (v: string[]) => void, v: string) {
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  }

  async function persist(input: SaveEntryInput) {
    if (user) {
      setSaving(true);
      setMsg("");
      const res = await saveMyAnswer(input);
      setSaving(false);
      if (!res.ok) {
        setMsg(res.error);
        return false;
      }
      return true;
    }
    // 未登录：本地暂存，登录后回填
    try {
      localStorage.setItem(ENTRY_DRAFT_KEY, JSON.stringify(input));
    } catch {
      /* ignore */
    }
    router.push(`/login?next=${encodeURIComponent(returnTo)}`);
    return false;
  }

  async function confirmNeed() {
    const ok = await persist({
      branch: "need",
      service_intents: serviceIntents,
      other_intents: otherIntents,
    });
    if (ok) {
      setDoneAs("need");
      setStep("done");
    }
  }

  async function confirmOffer() {
    if (!role) {
      setMsg("请先选择你在珠宝产业链里的角色");
      return;
    }
    if (offerCapIds.length === 0) {
      setMsg("请至少勾选一项你能提供的产品/服务");
      return;
    }
    const ok = await persist({
      branch: "offer",
      industry_role: role,
      offer_capability_ids: offerCapIds,
    });
    if (ok) {
      setDoneAs("offer");
      setStep("done");
    }
  }

  // ---- 已答过（card 模式卡片折叠态）----
  if (mode === "card" && step === "done" && initial?.done) {
    return (
      <div className="glass rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">
              {initial.branch === "offer"
                ? "你是珠宝产业链的“提供方”"
                : "你需要助理服务"}
            </p>
            <p className="mt-0.5 text-xs text-muted">已按你的偏好优化推荐</p>
          </div>
          <button
            onClick={() => router.push("/settings/preferences")}
            className="rounded-lg border border-gold/50 px-3 py-1.5 text-xs font-medium text-gold"
          >
            修改偏好
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-5">
      {/* 标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">先认识一下你</h2>
          <p className="mt-0.5 text-xs text-muted">选择后，我们会把相关的产品和服务摆到你面前</p>
        </div>
        {mode === "page" && (
          <button onClick={() => router.back()} className="text-xs text-muted">
            ← 返回
          </button>
        )}
      </div>

      {/* 第一步：你是谁 */}
      {step === "q1" && (
        <div className="mt-4 space-y-3">
          <button
            onClick={() => {
              setBranch("need");
              setStep("need");
            }}
            className="w-full rounded-2xl border border-gold/40 bg-gold/5 p-4 text-left transition-all hover:shadow-[0_10px_24px_-10px_rgba(176,141,74,0.5)]"
          >
            <p className="text-base font-semibold text-gold">我需要助理服务</p>
            <p className="mt-1 text-sm text-muted">我是顾客/消费者，想找金价、找货、代购、打金等服务</p>
          </button>
          <button
            onClick={() => {
              setBranch("offer");
              setStep("offer");
            }}
            className="w-full rounded-2xl border border-black/10 bg-white/60 p-4 text-left transition-all hover:shadow-[0_10px_24px_-12px_rgba(0,0,0,0.25)]"
          >
            <p className="text-base font-semibold">我也能提供服务/产品</p>
            <p className="mt-1 text-sm text-muted">我是工厂、档口、直播、检测……，想上架我的能力</p>
          </button>
        </div>
      )}

      {/* 【需要】分支：常用服务 + 其它意向 */}
      {step === "need" && (
        <div className="mt-4">
          <p className="text-sm font-medium">我常用的服务（可多选）</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {CUSTOMER_SERVICES.map((s) => (
              <Chip
                key={s.slug}
                active={serviceIntents.includes(s.slug)}
                onClick={() => toggle(serviceIntents, setServiceIntents, s.slug)}
              >
                {s.title}
              </Chip>
            ))}
          </div>

          <p className="mt-5 text-sm font-medium">我还想…（可多选）</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {OTHER_INTENTS.map((o) => (
              <Chip
                key={o.key}
                active={otherIntents.includes(o.key)}
                onClick={() => toggle(otherIntents, setOtherIntents, o.key)}
              >
                {o.label}
              </Chip>
            ))}
          </div>

          {msg && <p className="mt-3 text-sm text-danger">{msg}</p>}
          <button
            onClick={confirmNeed}
            disabled={saving}
            className="mt-5 w-full rounded-xl bg-primary py-3 font-medium text-primary-foreground disabled:opacity-50"
          >
            {saving ? "保存中…" : "完成"}
          </button>
        </div>
      )}

      {/* 【提供】分支：选择角色 */}
      {step === "offer" && (
        <div className="mt-4">
          <p className="text-sm font-medium">你属于珠宝产业链的哪一块？</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {INDUSTRY_ROLES.map((r) => (
              <Chip key={r.key} active={role === r.key} onClick={() => setRole(r.key)}>
                {r.label}
              </Chip>
            ))}
          </div>
          {msg && <p className="mt-3 text-sm text-danger">{msg}</p>}
          <button
            onClick={() => setStep("offerCats")}
            disabled={!role}
            className="mt-5 w-full rounded-xl bg-primary py-3 font-medium text-primary-foreground disabled:opacity-50"
          >
            下一步
          </button>
        </div>
      )}

      {/* 【提供】分支：选择可提供的产品/服务（来自供应能力表，可多选） */}
      {step === "offerCats" && (
        <div className="mt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              可选：你能提供什么
              <span className="text-muted">（{INDUSTRY_ROLES.find((r) => r.key === role)?.label} 的可提供能力）</span>
            </p>
            <button onClick={() => setStep("offer")} className="text-xs text-gold">
              换角色
            </button>
          </div>

          <div className="mt-3 space-y-4">
            {offerOptions.map((g) =>
              g.items.length === 0 ? null : (
                <div key={g.label}>
                  <p className="text-xs font-medium text-muted">{g.label}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {g.items.map((c) => (
                      <Chip
                        key={c.id}
                        active={offerCapIds.includes(c.id)}
                        onClick={() => toggle(offerCapIds, setOfferCapIds, c.id)}
                      >
                        {c.name}
                      </Chip>
                    ))}
                  </div>
                </div>
              )
            )}
            {offerOptions.every((g) => g.items.length === 0) && (
              <p className="text-sm text-muted">该角色暂时没有可提供的产品/服务，请返回选择其他角色。</p>
            )}
          </div>

          {msg && <p className="mt-3 text-sm text-danger">{msg}</p>}
          <button
            onClick={confirmOffer}
            disabled={saving}
            className="mt-5 w-full rounded-xl bg-primary py-3 font-medium text-primary-foreground disabled:opacity-50"
          >
            {saving ? "保存中…" : "完成"}
          </button>
        </div>
      )}

      {/* 完成态 */}
      {step === "done" && (
        <div className="mt-4 text-center">
          <p className="text-base font-semibold">已保存你的偏好</p>
          <p className="mt-1 text-sm text-muted">我们会据此优化首页和服务的推荐</p>

          {(doneAs === "offer" || otherIntents.includes("promoter")) && (
            <div className="mt-4 rounded-2xl border border-gold/40 bg-gold/5 p-4 text-left">
              <p className="text-sm font-medium text-gold">
                {doneAs === "offer" ? "你选择了“提供方”" : "你选择了“成为推广者”"}
              </p>
              <p className="mt-1 text-xs text-muted">
                {doneAs === "offer"
                  ? "去申请供应商 / 买家等角色资质，审核通过后即可上架你的提供的产品和服务。"
                  : "去申请推广者资质，审核通过后即可分享链接赚佣金。"}
              </p>
              <button
                onClick={() => router.push("/apply-role")}
                className="mt-3 w-full rounded-xl border border-gold/60 py-2.5 text-sm font-medium text-gold"
              >
                去申请角色资质
              </button>
            </div>
          )}

          <button
            onClick={() => router.push("/")}
            className="mt-4 w-full rounded-xl bg-primary py-3 font-medium text-primary-foreground"
          >
            去看看首页推荐
          </button>
        </div>
      )}
    </div>
  );
}