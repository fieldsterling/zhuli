"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase";
import { ensureZhuliUser } from "@/app/actions/auth";

const phoneSchema = z.object({
  phone: z.string().regex(/^1\d{10}$/, "请输入 11 位手机号"),
});
type PhoneData = z.infer<typeof phoneSchema>;

const codeSchema = z.object({
  phone: z.string().regex(/^1\d{10}$/),
  code: z.string().regex(/^\d{6}$/, "请输入 6 位验证码"),
});
type CodeData = z.infer<typeof codeSchema>;

const pwSchema = z.object({
  account: z.string().min(3, "请输入邮箱或手机号"),
  password: z.string().min(6, "密码至少 6 位"),
});
type PwData = z.infer<typeof pwSchema>;

export default function LoginPage() {
  const router = useRouter();
  const supabase = createBrowserClient();

  const [mode, setMode] = useState<"otp" | "password">("otp");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [sending, setSending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState("");

  const phoneForm = useForm<PhoneData>({ resolver: zodResolver(phoneSchema) });
  const codeForm = useForm<CodeData>({
    resolver: zodResolver(codeSchema),
    defaultValues: { phone: "", code: "" },
  });
  const pwForm = useForm<PwData>({ resolver: zodResolver(pwSchema) });

  async function sendCode(data: PhoneData) {
    setSending(true);
    setError("");
    const { error } = await supabase.auth.signInWithOtp({ phone: data.phone });
    setSending(false);
    if (error) {
      setError(error.message);
      return;
    }
    setPhone(data.phone);
    codeForm.setValue("phone", data.phone);
    setStep("code");
    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) clearInterval(timer);
        return c - 1;
      });
    }, 1000);
  }

  async function verifyAndLogin(data: CodeData) {
    setError("");
    const { error } = await supabase.auth.verifyOtp({
      phone: data.phone,
      token: data.code,
      type: "sms",
    });
    if (error) {
      setError(error.message);
      return;
    }
    await ensureZhuliUser();
    router.push("/");
    router.refresh();
  }

  async function loginWithPassword(data: PwData) {
    setError("");
    const account = data.account.trim();
    const isEmail = account.includes("@");
    const { error } = await supabase.auth.signInWithPassword(
      isEmail
        ? { email: account, password: data.password }
        : { phone: account, password: data.password }
    );
    if (error) {
      setError(error.message);
      return;
    }
    await ensureZhuliUser();
    router.push("/");
    router.refresh();
  }

  const isSending = sending || countdown > 0;
  const tabCls = (active: boolean) =>
    `flex-1 rounded-xl py-2.5 text-sm font-medium transition-colors ${
      active ? "bg-primary text-primary-foreground" : "text-muted"
    }`;

  return (
    <div className="flex min-h-screen flex-col px-5 pt-14">
      <h1 className="text-2xl font-semibold">登录珠宝助理</h1>
      <p className="mt-2 text-sm text-muted">水贝源头直供 · 手机验证码或密码登录</p>

      {/* 登录方式切换 */}
      <div className="glass mt-6 flex p-1">
        <button onClick={() => setMode("otp")} className={tabCls(mode === "otp")}>
          验证码登录
        </button>
        <button onClick={() => setMode("password")} className={tabCls(mode === "password")}>
          密码登录
        </button>
      </div>

      {mode === "otp" ? (
        step === "phone" ? (
          <form onSubmit={phoneForm.handleSubmit(sendCode)} className="mt-8 space-y-4">
            <div className="glass p-1">
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="请输入手机号"
                className="w-full bg-transparent px-4 py-3 text-base outline-none placeholder:text-muted/60"
                {...phoneForm.register("phone")}
              />
            </div>
            {phoneForm.formState.errors.phone && (
              <p className="text-sm text-danger">{phoneForm.formState.errors.phone.message}</p>
            )}
            <button
              type="submit"
              disabled={isSending}
              className="w-full rounded-2xl bg-primary py-3.5 font-medium text-primary-foreground disabled:opacity-50"
            >
              {isSending ? "发送中…" : "获取验证码"}
            </button>
          </form>
        ) : (
          <form onSubmit={codeForm.handleSubmit(verifyAndLogin)} className="mt-8 space-y-4">
            <div className="glass p-1 flex items-center">
              <input
                type="text"
                inputMode="numeric"
                placeholder="请输入 6 位验证码"
                maxLength={6}
                className="w-full bg-transparent px-4 py-3 text-base tracking-[0.5em] outline-none placeholder:text-muted/60"
                {...codeForm.register("code")}
              />
              <button
                type="button"
                disabled={countdown > 0}
                onClick={() => sendCode({ phone })}
                className="shrink-0 pr-3 text-sm text-primary disabled:text-muted"
              >
                {countdown > 0 ? `${countdown}s` : "重新获取"}
              </button>
            </div>
            {codeForm.formState.errors.code && (
              <p className="text-sm text-danger">{codeForm.formState.errors.code.message}</p>
            )}
            <input type="hidden" {...codeForm.register("phone")} />
            <button
              type="submit"
              className="w-full rounded-2xl bg-primary py-3.5 font-medium text-primary-foreground"
            >
              登录
            </button>
            <button
              type="button"
              onClick={() => setStep("phone")}
              className="w-full text-center text-sm text-muted"
            >
              ← 换个手机号
            </button>
          </form>
        )
      ) : (
        <form onSubmit={pwForm.handleSubmit(loginWithPassword)} className="mt-8 space-y-4">
          <div className="glass p-1">
            <input
              type="text"
              autoComplete="username"
              placeholder="邮箱 / 手机号"
              className="w-full bg-transparent px-4 py-3 text-base outline-none placeholder:text-muted/60"
              {...pwForm.register("account")}
            />
          </div>
          {pwForm.formState.errors.account && (
            <p className="text-sm text-danger">{pwForm.formState.errors.account.message}</p>
          )}
          <div className="glass p-1">
            <input
              type="password"
              autoComplete="current-password"
              placeholder="密码"
              className="w-full bg-transparent px-4 py-3 text-base outline-none placeholder:text-muted/60"
              {...pwForm.register("password")}
            />
          </div>
          {pwForm.formState.errors.password && (
            <p className="text-sm text-danger">{pwForm.formState.errors.password.message}</p>
          )}
          <button
            type="submit"
            className="w-full rounded-2xl bg-primary py-3.5 font-medium text-primary-foreground"
          >
            登录
          </button>
        </form>
      )}

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}

      <p className="mt-8 text-center text-xs leading-relaxed text-muted">
        登录即代表同意《用户协议》与《隐私政策》
      </p>

      <div className="mt-6 text-center text-sm text-muted">
        还没有账号？{" "}
        <Link href="/register" className="text-primary font-medium">
          立即注册
        </Link>
      </div>
    </div>
  );
}