"use server";

import { createServerClient } from "@/lib/supabase";
import { adminUser } from "@/app/actions/admin";

// zhuli_site_config 为宽松表（类型未生成），用宽松客户端访问
type LooseClient = { from: (table: string) => any };

const GUARD = { error: "无管理员权限" } as const;

/** 读取全部站点配置（键 -> 值）；仅管理员 */
export async function adminListSiteConfig() {
  const admin = await adminUser();
  if (!admin) return GUARD;
  const c = createServerClient() as unknown as LooseClient;
  const { data, error } = await c.from("zhuli_site_config").select("key, value, updated_at");
  if (error) return { error: error.message };
  return { items: (data ?? []).map((r: any) => ({ key: r.key, value: r.value ?? null, updated_at: r.updated_at })) };
}

/** 写入单个配置项（白名单键 + https URL 校验）；仅管理员 */
export async function adminSetSiteConfig(key: string, rawValue: string) {
  const admin = await adminUser();
  if (!admin) return GUARD;

  const allowlist = ["home_bg"];
  if (!allowlist.includes(key)) return { error: "不支持的配置键" };

  let value: unknown = null;
  if (rawValue && rawValue.trim()) {
    const v = rawValue.trim();
    // 当前仅支持 https 背景图；空值表示清空（回到默认渐变）
    if (!/^https:\/\//i.test(v)) return { error: "背景图需为 https:// 开头的图片 URL" };
    if (v.length > 512) return { error: "URL 过长" };
    value = { url: v };
  }

  const c = createServerClient() as unknown as LooseClient;
  const { error } = await c
    .from("zhuli_site_config")
    .upsert({ key, value, updated_by: admin.id }, { onConflict: "key" });
  if (error) return { error: error.message };
  return { ok: true };
}

/** 保存推荐设置（键 rec，存 JSON）；仅管理员 */
export async function adminSetRecConfig(settings: { behavior_products?: boolean }) {
  const admin = await adminUser();
  if (!admin) return GUARD;
  const value = { behavior_products: !!settings.behavior_products };
  const c = createServerClient() as unknown as LooseClient;
  const { error } = await c
    .from("zhuli_site_config")
    .upsert({ key: "rec", value, updated_by: admin.id }, { onConflict: "key" });
  if (error) return { error: error.message };
  return { ok: true };
}