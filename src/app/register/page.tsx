"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createBrowserClient } from "@/lib/supabase";
import { registerPhone, ensureProfileForAuthUser } from "@/app/actions/auth";

const phoneSchema = z.object({
  phone: z.string().regex(/^1\d{10}$/, "请输入 11 位手机号"),
  password: z.string().min(6, "密码至少 6 位"),
  agree: z.boolean().refine((v) => v, "请勾选同意用户协议"),
});
type PhoneData = z.infer<typeof phoneSchema>;

const emailSchema = z.object({
  email: z.string().email("邮箱格式不正确"),
  password: z.string().min(6, "密码至少 6 位"),
  agree: z.boolean().refine((v) => v, "请勾选同意用户协议"),
});
type EmailData = z.infer<typeof emailSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createBrowserClient();

  const [mode, setMode] = useState<"phone" | "email">("phone");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const phoneForm = useForm<PhoneData>({ resolver: zodResolver(phoneSchema) });
  const emailForm = useForm<EmailData>({ resolver: zodResolver(emailSchema) });

  async function onPhone(data: PhoneData) {
    setSubmitting(true);
    setError("");
    setNotice("");
    const res = await registerPhone({ phone: data.phone, password: data.password });
    setSubmitting(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setNotice(`注册成功！该手机号无需邮箱验证，返回登录页用短信验证码登录即可。`);
  }

  async function onEmail(data: EmailData) {
    setSubmitting(true);
    setError("");
    setNotice("");
    const { data: signRes, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/login`,
      },
    });
    setSubmitting(false);
    if (error) {
      setError(error.message);
      return;
    }
    if (signRes.user) {
      await ensureProfileForAuthUser({
        userId: signRes.user.id,
        email: data.email,
        phone: signRes.user.phone ?? null,
      });
    }
    // 若已自动登录（未开启邮箱确认），直接进首页；否则提示查收验证链接
    if (signRes.session) {
      router.push("/");
      router.refresh();
      return;
    }
    setNotice("验证链接已发送到你的邮箱，点击邮件中的链接完成注册后再登录。");
  }

  const common = {
    className:
      "w-full bg-transparent px-4 py-3 text-base outline-none placeholder:text-muted/60",
  };

  return (
    <div className="flex min-h-screen flex-col px-5 pt-14">
      <h1 className="text-2xl font-semibold">注册珠宝助理</h1>
      <p className="mt-2 text-sm text-muted">选择一种方式创建账号</p>

      {/* 注册方式切换 */}
      <div className="glass mt-6 flex p-1">
        <button
          onClick={() => setMode("phone")}
          className={`flex-1 rounded-xl py-2.5 text-sm font-medium transition-colors ${
            mode === "phone" ? "bg-primary text-primary-foreground" : "text-muted"
          }`}
        >
          手机号注册
        </button>
        <button
          onClick={() => setMode("email")}
          className={`flex-1 rounded-xl py-2.5 text-sm font-medium transition-colors ${
            mode === "email" ? "bg-primary text-primary-foreground" : "text-muted"
          }`}
        >
          邮箱注册
        </button>
      </div>

      {mode === "phone" ? (
        <form onSubmit={phoneForm.handleSubmit(onPhone)} className="mt-6 space-y-4">
          <div className="glass p-1">
            <input type="tel" inputMode="tel" autoComplete="tel" placeholder="手机号"
              {...phoneForm.register("phone")} {...common} />
          </div>
          {phoneForm.formState.errors.phone && (
            <p className="text-sm text-danger">{phoneForm.formState.errors.phone.message}</p>
          )}
          <div className="glass p-1">
            <input type="password" autoComplete="new-password" placeholder="设置密码（≥6位）"
              {...phoneForm.register("password")} {...common} />
          </div>
          {phoneForm.formState.errors.password && (
            <p className="text-sm text-danger">{phoneForm.formState.errors.password.message}</p>
          )}
          <label className="flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" {...phoneForm.register("agree")} className="accent-primary" />
            我已阅读并同意《用户协议》与《隐私政策》
          </label>
          {phoneForm.formState.errors.agree && (
            <p className="text-sm text-danger">{phoneForm.formState.errors.agree.message}</p>
          )}
          <button type="submit" disabled={submitting}
            className="w-full rounded-2xl bg-primary py-3.5 font-medium text-primary-foreground disabled:opacity-50">
            {submitting ? "注册中…" : "注册"}
          </button>
        </form>
      ) : (
        <form onSubmit={emailForm.handleSubmit(onEmail)} className="mt-6 space-y-4">
          <div className="glass p-1">
            <input type="email" autoComplete="email" placeholder="邮箱地址"
              {...emailForm.register("email")} {...common} />
          </div>
          {emailForm.formState.errors.email && (
            <p className="text-sm text-danger">{emailForm.formState.errors.email.message}</p>
          )}
          <div className="glass p-1">
            <input type="password" autoComplete="new-password" placeholder="设置密码（≥6位）"
              {...emailForm.register("password")} {...common} />
          </div>
          {emailForm.formState.errors.password && (
            <p className="text-sm text-danger">{emailForm.formState.errors.password.message}</p>
          )}
          <label className="flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" {...emailForm.register("agree")} className="accent-primary" />
            我已阅读并同意《用户协议》与《隐私政策》
          </label>
          {emailForm.formState.errors.agree && (
            <p className="text-sm text-danger">{emailForm.formState.errors.agree.message}</p>
          )}
          <button type="submit" disabled={submitting}
            className="w-full rounded-2xl bg-primary py-3.5 font-medium text-primary-foreground disabled:opacity-50">
            {submitting ? "提交中…" : "注册"}
          </button>
          <p className="text-xs leading-relaxed text-muted">
            邮箱注册需点击验证邮件中的链接完成确认。
          </p>
        </form>
      )}

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}
      {notice && <p className="mt-4 rounded-xl bg-emerald-500/10 p-3 text-sm text-emerald-600">{notice}</p>}

      <div className="mt-8 text-center text-sm text-muted">
        已有账号？{" "}
        <Link href="/login" className="text-primary">
          去登录
        </Link>
      </div>
    </div>
  );
}