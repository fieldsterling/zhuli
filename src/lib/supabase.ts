import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

// 浏览器端客户端（用 NEXT_PUBLIC_ 前缀的公开变量，配合 RLS 生效）
// 双保险单例：模块级 + globalThis，即使 lib 模块被拆到多个 chunk 也只建一份 client，
// 根除「GoTrueClient 多实例」警告与重复初始化开销。
const BROWSER_KEY = "__zhuliBrowserClient__";
export function createBrowserClient() {
  const g = globalThis as Record<string, unknown>;
  const existing = g[BROWSER_KEY] as SupabaseClient<Database> | undefined;
  if (existing) return existing;
  const client = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: true, autoRefreshToken: true },
    }
  );
  g[BROWSER_KEY] = client;
  return client;
}

// 服务端客户端（用 service role，绕过 RLS，仅供 Server 端使用）
let _serverClient: ReturnType<typeof createClient<Database>> | null = null;
export function createServerClient() {
  if (_serverClient) return _serverClient;
  _serverClient = createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false },
      global: {
        headers: { "X-Application-Name": "zhuli-assistant" },
      },
    }
  );
  return _serverClient;
}