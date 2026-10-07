"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase";
import { useAuthStore } from "@/store/auth";
import { applyForReferrer, updateMyReferrer, getMyPromoterStats } from "@/app/actions/auth";

type MyRef = {
  id: string;
  code: string;
  label?: string | null;
  status: string;
  created_at: string;
};

export default function PromoterPage() {
  const router = useRouter();
  const supabase = createBrowserClient();
  const user = useAuthStore((s) => s.user);

  const [ref, setRef] = useState<MyRef | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{ ref_users: number; order_count: number; task_count: number } | null>(null);

  const [code, setCode] = useState("");
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    // 类型生成尚缺 zhuli_referrers 表，用宽松客户端访问
    const { data } = await (supabase as unknown as { from: (t: string) => any })
      .from("zhuli_referrers")
      .select("id, code, label, status, created_at")
      .eq("user_id", user.id)
      .maybeSingle();
    const row = (data ?? null) as MyRef | null;
    setRef(row);
    if (row?.status === "approved") {
      setCode(row.code);
      setLabel((row.label as string) ?? "");
      const s = await getMyPromoterStats();
      if (s.data) setStats(s.data);
    }
    setLoading(false);
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

  async function apply() {
    setBusy(true);
    setMsg(null);
    const res = await applyForReferrer();
    setBusy(false);
    if (res.ok) {
      setMsg({ type: "ok", text: "已提交推广申请，等待平台审核" });
      await load();
    } else {
      setMsg({ type: "err", text: res.error ?? "申请失败" });
    }
  }

  async function save() {
    setBusy(true);
    setMsg(null);
    const res = await updateMyReferrer({ code, label });
    setBusy(false);
    if (res.ok) {
      setMsg({ type: "ok", text: "已保存" });
      await load();
    } else {
      setMsg({ type: "err", text: res.error ?? "保存失败" });
    }
  }

  const shareUrl = ref ? `${window.location.origin}/?ref=${ref.code}` : "";

  async function copyShare() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="px-5 pt-8 pb-16">
      <button onClick={() => router.back()} className="text-sm text-muted">← 返回</button>
      <h1 className="mt-2 text-xl font-semibold">推广中心</h1>
      <p className="mt-1 text-sm text-muted">分享专属链接，带来业务的提交都归属于你</p>

      <div className="mt-5">
        {loading ? (
          <div className="h-40 animate-pulse rounded-2xl bg-black/5" />
        ) : !ref ? (
          /* 未申请 */
          <div className="glass rounded-2xl p-6 text-center">
            <p className="text-lg font-semibold">成为推广者</p>
            <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted">
              审核通过后你将获得专属分享链接（默认 5 位字母数字，可自改）。通过你的链接进入的用户，其订单/找货/代购/质检/跑腿提交都会记到你名下。
            </p>
            <button onClick={apply} disabled={busy} className="mt-4 w-full rounded-xl bg-primary py-3 font-medium text-primary-foreground disabled:opacity-50">
              {busy ? "提交中…" : "申请成为推广者"}
            </button>
          </div>
        ) : ref.status === "pending" ? (
          <div className="glass rounded-2xl p-6 text-center">
            <p className="text-lg font-semibold">审核中</p>
            <p className="mt-2 text-sm text-muted">你的推广申请已提交，平台审核通过后即可开始推广。</p>
          </div>
        ) : ref.status === "rejected" ? (
          <div className="glass rounded-2xl p-6 text-center">
            <p className="text-lg font-semibold">申请未通过</p>
            <p className="mt-2 text-sm text-muted">如有疑问请联系平台。</p>
          </div>
        ) : (
          /* 已通过：展示分享链接 + 可编辑 */
          <div className="space-y-4">
            <div className="glass rounded-2xl p-5">
              <p className="text-sm font-medium">我的专属分享链接</p>
              <div className="mt-3 flex items-center gap-2">
                <input
                  readOnly
                  value={shareUrl}
                  className="min-w-0 flex-1 rounded-lg bg-black/5 px-3 py-2.5 text-sm outline-none"
                />
                <button onClick={copyShare} className="shrink-0 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground">
                  {copied ? "已复制" : "复制"}
                </button>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                <div className="rounded-xl bg-black/5 py-3">
                  <p className="text-lg font-semibold">{stats?.ref_users ?? 0}</p>
                  <p className="text-xs text-muted">引入用户</p>
                </div>
                <div className="rounded-xl bg-black/5 py-3">
                  <p className="text-lg font-semibold">{stats?.order_count ?? 0}</p>
                  <p className="text-xs text-muted">订单</p>
                </div>
                <div className="rounded-xl bg-black/5 py-3">
                  <p className="text-lg font-semibold">{stats?.task_count ?? 0}</p>
                  <p className="text-xs text-muted">需求</p>
                </div>
              </div>
            </div>

            <div className="glass rounded-2xl p-5">
              <p className="text-sm font-medium">设置</p>
              <div className="mt-3 space-y-3">
                <label className="block">
                  <span className="text-xs text-muted">分享码（3-16 位字母或数字，默认 5 位）</span>
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="mt-1.5 w-full rounded-lg bg-black/5 px-3 py-2.5 text-sm uppercase outline-none"
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-muted">自定义名称（展示用）</span>
                  <input
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="例如：某某珠宝馆"
                    className="mt-1.5 w-full rounded-lg bg-black/5 px-3 py-2.5 text-sm outline-none"
                  />
                </label>
                <button onClick={save} disabled={busy} className="w-full rounded-xl bg-black/5 py-3 font-medium disabled:opacity-50">
                  {busy ? "保存中…" : "保存设置"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {msg && <p className={`mt-4 text-sm ${msg.type === "err" ? "text-danger" : "text-green-600"}`}>{msg.text}</p>}
    </div>
  );
}