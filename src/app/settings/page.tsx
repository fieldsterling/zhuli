"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createBrowserClient } from "@/lib/supabase";
import { useAuthStore } from "@/store/auth";
import { uploadToCos } from "@/lib/upload";

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createBrowserClient();
  const user = useAuthStore((s) => s.user);

  const [nickname, setNickname] = useState("");
  const [phone, setPhone] = useState("");
  const [avatar, setAvatar] = useState("");
  const [upAvatar, setUpAvatar] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState<"profile" | "pwd" | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("zhuli_users")
      .select("nickname, phone")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setNickname(data?.nickname ?? "");
        setPhone(data?.phone ?? "");
      });
    setAvatar(user.user_metadata?.avatar_url ?? "");
  }, [supabase, user]);

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

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUpAvatar(true);
    setMsg(null);
    try {
      const url = await uploadToCos(file, "avatar");
      setAvatar(url);
      setMsg({ type: "ok", text: "头像已上传，记得点保存资料" });
    } catch (err) {
      setMsg({ type: "err", text: err instanceof Error ? err.message : "头像上传失败" });
    } finally {
      setUpAvatar(false);
    }
  }

  async function saveProfile() {
    if (!user) return;
    setBusy("profile");
    setMsg(null);
    // 更新 auth 头像元数据
    const { error: authErr } = await supabase.auth.updateUser({
      data: { avatar_url: avatar.trim() || null },
    });
    // 更新 zhuli_users 用户名 + 手机号
    const { error } = await supabase
      .from("zhuli_users")
      .update({ nickname: nickname.trim() || null, phone: phone.trim() || null })
      .eq("id", user.id);
    setBusy(null);
    if (authErr || error) {
      setMsg({ type: "err", text: (authErr?.message || error?.message || "保存失败").replace(/^\[.*?\]\s*/, "") });
    } else {
      setMsg({ type: "ok", text: "资料已保存" });
    }
  }

  async function changePassword() {
    setMsg(null);
    if (password.length < 6) {
      setMsg({ type: "err", text: "新密码至少 6 位" });
      return;
    }
    if (password !== confirm) {
      setMsg({ type: "err", text: "两次输入的密码不一致" });
      return;
    }
    setBusy("pwd");
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(null);
    if (error) {
      setMsg({ type: "err", text: error.message.replace(/^\[.*?\]\s*/, "") });
    } else {
      setMsg({ type: "ok", text: "密码修改成功" });
      setPassword("");
      setConfirm("");
    }
  }

  return (
    <div className="px-5 pt-8 pb-16">
      <button onClick={() => router.back()} className="text-sm text-muted">
        ← 返回
      </button>
      <h1 className="mt-2 text-xl font-semibold">账号设置</h1>

      {/* 我的偏好 */}
      <Link
        href="/settings/preferences"
        className="mt-5 flex items-center justify-between rounded-2xl border border-gold/40 bg-gold/5 p-4"
      >
        <div>
          <p className="text-sm font-semibold text-gold">我的偏好</p>
          <p className="mt-0.5 text-xs text-muted">告诉平台你是谁，优化产品和服务推荐</p>
        </div>
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-gold" stroke="currentColor" strokeWidth="1.7">
          <path d="m9 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Link>

      {/* 头像 */}
      <section className="mt-6 flex items-center gap-4">
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatar} alt="头像" className="h-16 w-16 rounded-full object-cover" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-2xl font-semibold text-primary">
            {(nickname || "珠").slice(0, 1)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <label className="block text-xs text-muted">头像图片 URL</label>
          <input
            value={avatar}
            onChange={(e) => setAvatar(e.target.value)}
            placeholder="https://…"
            className="mt-1 w-full rounded-lg bg-black/5 px-3 py-2 text-sm outline-none"
          />
          <label className="mt-2 inline-block cursor-pointer rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50">
            {upAvatar ? "上传中…" : "上传头像"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleAvatarUpload}
              disabled={upAvatar}
            />
          </label>
        </div>
      </section>

      {/* 基本资料 */}
      <section className="mt-6 space-y-3">
        <Field label="用户名">
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="你的昵称"
            className="w-full rounded-lg bg-black/5 px-3 py-2.5 text-sm outline-none"
          />
        </Field>
        <Field label="手机号">
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="11 位手机号"
            inputMode="tel"
            className="w-full rounded-lg bg-black/5 px-3 py-2.5 text-sm outline-none"
          />
        </Field>
        <button
          onClick={saveProfile}
          disabled={busy === "profile"}
          className="mt-1 w-full rounded-xl bg-primary py-3 font-medium text-primary-foreground disabled:opacity-50"
        >
          {busy === "profile" ? "保存中…" : "保存资料"}
        </button>
      </section>

      {/* 修改密码 */}
      <section className="mt-8">
        <h2 className="text-base font-semibold">修改密码</h2>
        <div className="mt-3 space-y-3">
          <Field label="新密码">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="至少 6 位"
              className="w-full rounded-lg bg-black/5 px-3 py-2.5 text-sm outline-none"
            />
          </Field>
          <Field label="确认新密码">
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="再次输入新密码"
              className="w-full rounded-lg bg-black/5 px-3 py-2.5 text-sm outline-none"
            />
          </Field>
          <button
            onClick={changePassword}
            disabled={busy === "pwd"}
            className="w-full rounded-xl bg-black/5 py-3 font-medium disabled:opacity-50"
          >
            {busy === "pwd" ? "提交中…" : "修改密码"}
          </button>
        </div>
      </section>

      {msg && (
        <p className={`mt-4 text-sm ${msg.type === "err" ? "text-danger" : "text-green-600"}`}>
          {msg.text}
        </p>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm text-muted">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}