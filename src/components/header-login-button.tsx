"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase";
import { useAuthStore } from "@/store/auth";

/** 首页右上角登录态按钮：未登录显示「登录」，已登录显示昵称并支持登出 */
export function HeaderLoginButton() {
  const user = useAuthStore((s) => s.user);
  const setSession = useAuthStore((s) => s.setSession);
  const router = useRouter();

  if (!user) {
    return (
      <Link
        href="/login"
        className="glass px-4 py-2 text-sm font-medium text-foreground"
      >
        登录
      </Link>
    );
  }

  const nickname =
    (user.user_metadata?.nickname as string) ||
    (user.phone ? `用户${user.phone.slice(-4)}` : "珠宝用户");

  async function logout() {
    const supabase = createBrowserClient();
    await supabase.auth.signOut();
    setSession(null);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <Link href="/profile" className="glass px-4 py-2 text-sm font-medium">
        {nickname}
      </Link>
      <button
        onClick={logout}
        className="text-xs text-muted transition-colors hover:text-danger"
      >
        退出
      </button>
    </div>
  );
}