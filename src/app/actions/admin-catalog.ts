"use server";

import { createServerClient } from "@/lib/supabase";
import { adminUser } from "@/app/actions/admin";

// 生成的 Database 类型尚未包含目录/主体相关表，沿用宽松客户端访问
type LooseClient = { from: (table: string) => any };

const GUARD = { error: "无管理员权限" };

/**
 * 产品目录全量数据：分类树 + 产品 + 主体 + 产品-主体关联。
 * 供「产品目录」后台一次性拉取，前端拼装分类树并做上架/下架。
 */
export async function adminListCatalog() {
  const admin = await adminUser();
  if (!admin) return GUARD;
  const server = createServerClient() as unknown as LooseClient;

  const [catR, prodR, entR, relR] = await Promise.all([
    server
      .from("zhuli_catalog_categories")
      .select("id, parent_id, code, name, level, sort")
      .order("sort", { ascending: true }),
    server
      .from("zhuli_catalog_products")
      .select(
        "id, name, category_id, kind, hw_type, is_consumable, price_min, price_typical, price_max, price_raw, price_period, status, sort"
      )
      .order("sort", { ascending: true }),
    server.from("zhuli_entities").select("id, code, name, description, sort").order("sort", { ascending: true }),
    server.from("zhuli_catalog_product_entities").select("product_id, entity_id"),
  ]);

  return {
    categories: (catR.data ?? []) as Array<Record<string, any>>,
    products: (prodR.data ?? []) as Array<Record<string, any>>,
    entities: (entR.data ?? []) as Array<Record<string, any>>,
    productEntities: (relR.data ?? []) as Array<Record<string, any>>,
  };
}

/** 目录产品 上架/下架 */
export async function adminSetCatalogProduct(id: string, status: "listed" | "off") {
  const admin = await adminUser();
  if (!admin) return GUARD;
  const { error } = await (createServerClient() as unknown as LooseClient)
    .from("zhuli_catalog_products")
    .update({ status })
    .eq("id", id);
  return error ? { error: error.message } : { ok: true };
}

/** 全部用户的·主体标签 */
export async function adminListCustomerEntities() {
  const admin = await adminUser();
  if (!admin) return GUARD;
  const server = createServerClient() as unknown as LooseClient;
  const [ueR, eR] = await Promise.all([
    server.from("zhuli_user_entities").select("id, user_id, entity_id"),
    server.from("zhuli_entities").select("id, name").order("sort", { ascending: true }),
  ]);
  return {
    userEntities: (ueR.data ?? []) as Array<Record<string, any>>,
    entities: (eR.data ?? []) as Array<Record<string, any>>,
  };
}

/** 设置某用户的主体标签（整体覆盖：先删旧，再插新） */
export async function adminSetUserEntities(userId: string, entityIds: string[]) {
  const admin = await adminUser();
  if (!admin) return GUARD;
  const server = createServerClient() as unknown as LooseClient;

  const { error: delErr } = await server.from("zhuli_user_entities").delete().eq("user_id", userId);
  if (delErr) return { error: delErr.message };

  const cleaned = Array.from(new Set((entityIds ?? []).filter(Boolean)));
  if (!cleaned.length) return { ok: true };

  const { error: insErr } = await server
    .from("zhuli_user_entities")
    .insert(cleaned.map((entity_id) => ({ user_id: userId, entity_id })));
  return insErr ? { error: insErr.message } : { ok: true };
}