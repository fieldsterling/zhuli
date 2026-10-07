"server";

import { createServerClient } from "@/lib/supabase";

type LooseClient = { from: (table: string) => any };

/** 读取首页背景图 URL（管理员在后台配置）；未配置返回 null */
export async function getHomeBg(): Promise<string | null> {
  try {
    const c = createServerClient() as unknown as LooseClient;
    const { data } = await c
      .from("zhuli_site_config")
      .select("value")
      .eq("key", "home_bg")
      .maybeSingle();
    const url = data?.value?.url;
    return typeof url === "string" && /^https:\/\//i.test(url) ? url : null;
  } catch {
    return null;
  }
}