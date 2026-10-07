"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase";
import { useAuthStore } from "@/store/auth";
import { applyForRole } from "@/app/actions/auth";

const ROLES = [
  {
    key: "supplier",
    label: "供应商",
    desc: "上传商品、管理供货、平台审核后统一上架",
    tint: "#8a5a33",
  },
  {
    key: "buyer",
    label: "跑腿买手",
    desc: "接取找货/跑腿需求并报价",
    tint: "#3a6ea5",
  },
] as const;

const ROLE_LABEL: Record<string, string> = {
  admin: "管理员",
  supplier: "供应商",
  buyer: "跑腿买手",
  customer_b: "B端客户",
  customer_c: "个人客户",
};
const APPLY_STATUS: Record<string, string> = {
  pending: "待审核",
  approved: "已通过",
  rejected: "已驳回",
};

type Application = {
  id: string;
  role: string;
  status: string;
  note?: string | null;
  created_at: string;
};

export default function ApplyRolePage() {
  const router = useRouter();
  const supabase = createBrowserClient();
  const user = useAuthStore((s) => s.user);
  const [apps, setApps] = useState<Application[]>([]);
  const [role, setRole] = useState("");
  const [note, setNote] = useState("");
  const [target, setTarget] = useState<"supplier" | "buyer" | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    supabase
      .from("zhuli_users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => setRole((data?.role as string) ?? ""));
    supabase
      .from("zhuli_role_applications")
      .select("id, role, status, note, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setApps(data ?? []));
  }, [supabase, user]);

  useEffect(() => {
    load();
  }, [load]);

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

  async function submit(r: "supplier" | "buyer") {
    setBusy(true);
    setMsg(null);
    const res = await applyForRole(r, note);
    setBusy(false);
    if (res.ok) {
      setMsg({ type: "ok", text: "申请已提交，等待平台审核" });
      setTarget(null);
      setNote("");
      await load();
    } else {
      setMsg({ type: "err", text: res.error ?? "提交失败" });
    }
  }

  const pendingRole = apps.find((a) => a.status === "pending")?.role;

  return (
    <div className="px-5 pt-8 pb-16">
      <button onClick={() => router.back()} className="text-sm text-muted">← 返回</button>
      <h1 className="mt-2 text-xl font-semibold">申请加入平台</h1>
      <p className="mt-1 text-sm text-muted">当前身份：{ROLE_LABEL[role] ?? "普通用户"}</p>

      {/* 可申请的角色 */}
      <div className="mt-5 space-y-3">
        {ROLES.map((r) => {
          const isCurrent = role === r.key;
          const myStatus = apps.find((a) => a.role === r.key)?.status;
          const disabled = isCurrent || pendingRole !== undefined;
          return (
            <div key={r.key} className="glass rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold text-white" style={{ background: r.tint }}>
                    {r.label.slice(0, 1)}
                  </span>
                  <div>
                    <p className="text-base font-medium">{r.label}</p>
                    <p className="text-xs text-muted">{r.desc}</p>
                  </div>
                </div>
                {isCurrent ? (
                  <span className="text-xs text-muted">已是{r.label}</span>
                ) : myStatus ? (
                  <span className="rounded-full bg-black/5 px-2 py-0.5 text-xs">{APPLY_STATUS[myStatus] ?? myStatus}</span>
                ) : null}
              </div>
              {target === r.key && (
                <div className="mt-3">
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder={`补充${r.label}申请说明（可选）`}
                    rows={2}
                    className="w-full rounded-lg bg-black/5 px-3 py-2 text-sm outline-none"
                  />
                  <div className="mt-2 flex gap-2">
                    <button onClick={() => setTarget(null)} className="rounded-lg bg-black/5 px-4 py-2 text-sm font-medium">
                      取消
                    </button>
                    <button onClick={() => submit(r.key)} disabled={busy} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
                      {busy ? "提交中…" : "确认申请"}
                    </button>
                  </div>
                </div>
              )}
              {!isCurrent && !myStatus && target !== r.key && (
                <button onClick={() => setTarget(r.key)} disabled={disabled} className="mt-3 w-full rounded-xl bg-black/5 py-2.5 text-sm font-medium disabled:opacity-40">
                  申请成为{r.label}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* 历史申请 */}
      {apps.length > 0 && (
        <section className="mt-8">
          <h2 className="text-base font-semibold">申请记录</h2>
          <div className="mt-3 space-y-2">
            {apps.map((a) => (
              <div key={a.id} className="glass flex items-center justify-between rounded-2xl px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{ROLE_LABEL[a.role] ?? a.role}</p>
                  <p className="text-xs text-muted">{new Date(a.created_at).toLocaleString("zh-CN")}</p>
                </div>
                <span className="text-xs">{APPLY_STATUS[a.status] ?? a.status}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {msg && <p className={`mt-4 text-sm ${msg.type === "err" ? "text-danger" : "text-green-600"}`}>{msg.text}</p>}
    </div>
  );
}