"use server";

import { createServerClient } from "@/lib/supabase";
import { adminUser } from "@/app/actions/admin";

// 生成的 Database 类型尚未包含 zhuli_user_profiles / zhuli_profile_attributes 表，用宽松客户端访问
type LooseClient = { from: (table: string) => any };

const GUARD = { error: "无管理员权限" };

/** 逗号文本 -> 数组；空则为空数组 */
function toArr(v: unknown): string[] {
  if (Array.isArray(v)) return v;
  if (typeof v !== "string" || !v.trim()) return [];
  return v
    .split(/[,，]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** 档案表单可编辑字段白名单（系统只读字段不入此表） */
const EDITABLE_KEYS = [
  "entity_type",
  "entity_subtype",
  "display_name",
  "legal_name",
  "unified_social_credit_code",
  "id_card_hash",
  "verification_level",
  "account_status",
  "contact_phone",
  "contact_wechat",
  "operating_address",
  "service_region",
  "online_presence",
  "chain_role_primary",
  "product_categories",
  "material_capabilities",
  "craft_capabilities",
  "certifications",
  "digital_ai_level",
  "price_band",
  "admin_tags",
  "admin_rating",
  "admin_status",
  "admin_notes",
] as const;

/** 需要把数组转成 jsonb 的字段 */
const ARRAY_KEYS: Record<string, "jsonb" | "text" | "int" | "keep"| "number"> = {
  service_region: "jsonb",
  online_presence: "jsonb",
  product_categories: "jsonb",
  material_capabilities: "jsonb",
  craft_capabilities: "jsonb",
  certifications: "jsonb",
  admin_tags: "jsonb",
  admin_rating: "int",
};

/** 客户列表 + 对应档案（档案为空则 null）——仅管理员 */
export async function adminListProfiles() {
  const admin = await adminUser();
  if (!admin) return GUARD;
  const apps = createServerClient() as unknown as LooseClient;
  const base = createServerClient();

  const [uR, pR] = await Promise.all([
    base
      .from("zhuli_users")
      .select("id, phone, nickname, company_name, role, created_at")
      .order("created_at", { ascending: false })
      .limit(200),
    apps.from("zhuli_user_profiles").select("*"),
  ]);

  const profilesByUser: Record<string, any> = {};
  for (const p of pR.data ?? []) profilesByUser[p.user_id] = p;

  return { users: (uR.data ?? []) as any[], profilesByUser };
}

/** 保存/新建档案（仅管理员；只接受可编辑字段白名单，忽略系统只读字段） */
export async function adminUpsertProfile(userId: string, patchRecord: Record<string, unknown>) {
  const admin = await adminUser();
  if (!admin) return GUARD;
  const apps = createServerClient() as unknown as LooseClient;

  // 白名单 + 类型整理
  const patch: Record<string, unknown> = {};
  for (const key of EDITABLE_KEYS) {
    if (!(key in patchRecord)) continue;
    const raw = patchRecord[key];
    const kind = ARRAY_KEYS[key];
    if (kind === "jsonb") patch[key] = toArr(raw);
    else if (kind === "int") patch[key] = raw == null || raw === "" ? null : Number(raw);
    else patch[key] = raw;
  }
  if (!Object.keys(patch).length) return { error: "无有效字段可保存" };

  const { data: exist } = await apps
    .from("zhuli_user_profiles")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  const out = exist
    ? await apps.from("zhuli_user_profiles").update(patch).eq("user_id", userId)
    : await apps.from("zhuli_user_profiles").insert({ user_id: userId, ...patch });

  return out.error ? { error: out.error.message } : { ok: true };
}