"use client";

import { useEffect } from "react";
import { createBrowserClient } from "@/lib/supabase";
import { useAuthStore } from "@/store/auth";
import { AUTH_TOKEN_COOKIE } from "@/lib/auth-cookie";
import { getVisitorId } from "@/lib/track";
import { mergeAnonymousBehavior } from "@/app/actions/behavior";
import { ENTRY_DRAFT_KEY } from "@/lib/industry";
import { saveMyAnswer } from "@/app/actions/myself-answer";

/** 把 access_token 写入 cookie，供 Server Action 读取当前用户 */
function setAuthCookie(token: string | null) {
  if (typeof document === "undefined") return;
  const maxAge = token ? 60 * 60 * 24 * 7 : -1; // 7 天 / 清除
  const secure = window.location.protocol === "https:";
  document.cookie = `${AUTH_TOKEN_COOKIE}=${encodeURIComponent(token ?? "")}; path=/; max-age=${maxAge}; samesite=lax${secure ? "; secure" : ""}`;
}

/**
 * 客户端会话启动器：挂载时从首页面拉取当前 session 写入全局 store，
 * 并监听 auth 状态变化（登录/登出/刷新 token 后自动同步）。
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setSession = useAuthStore((s) => s.setSession);

  useEffect(() => {
    const supabase = createBrowserClient();

    let wasLoggedIn = false;

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        setSession(session);
        setAuthCookie(session?.access_token ?? null);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setAuthCookie(session?.access_token ?? null);
      // 未登录 → 登录 切换：把该访客 ID 的匿名行为合并回当前账号
      const nowLoggedIn = !!session;
      if (nowLoggedIn && !wasLoggedIn) {
        const vid = getVisitorId();
        if (vid) {
          try {
            void mergeAnonymousBehavior(vid);
          } catch {
            /* 静默 */
          }
        }
        // 登录时回填「首访分流/我的偏好」的本地暂存
        try {
          const draft = localStorage.getItem(ENTRY_DRAFT_KEY);
          if (draft) {
            const input = JSON.parse(draft);
            void saveMyAnswer(input);
            localStorage.removeItem(ENTRY_DRAFT_KEY);
          }
        } catch {
          /* 静默 */
        }
      }
      wasLoggedIn = nowLoggedIn;
    });

    return () => subscription.unsubscribe();
  }, [setSession]);

  return <>{children}</>;
}