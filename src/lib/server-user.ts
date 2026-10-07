// 服务端专用：从请求 cookie 解析当前登录用户。
// 仅供 Server Action / Route Handler 使用（不要被客户端组件 import）。
import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@/lib/supabase";
import { AUTH_TOKEN_COOKIE } from "@/lib/auth-cookie";
import type { User } from "@supabase/supabase-js";

/**
 * 读取当前登录用户（从 cookie 里的 access_token 解析）。
 * 服务端无 localStorage，必须用 cookie；拿到 user 后即可用其 id 走 service role
 * 校验 zhuli_users.role 或归属关系。
 */
export async function getServerUser(): Promise<User | null> {
  const store = await cookies();
  const token = store.get(AUTH_TOKEN_COOKIE)?.value;
  if (!token) return null;
  const { data } = await createServerClient().auth.getUser(token);
  return data.user ?? null;
}