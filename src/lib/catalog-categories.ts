import { createServerClient } from "@/lib/supabase";

// 生成的 Database 类型尚未包含目录分类表，沿用宽松客户端访问
type LooseClient = { from: (table: string) => any };

export type CatalogGroup = {
  id: string;
  name: string;
  children: { id: string; name: string }[];
};

/** 读取目录分类树（一级 + 二级），供「我的偏好」选择可提供的产品/服务 */
export async function fetchCatalogTree(): Promise<CatalogGroup[]> {
  const supabase = createServerClient() as unknown as LooseClient;
  const { data } = await supabase
    .from("zhuli_catalog_categories")
    .select("id, name, level, parent_id")
    .order("name");
  const rows = data ?? [];
  const l1 = rows.filter((r: any) => r.level === 1);
  return l1.map((p: any) => ({
    id: p.id,
    name: p.name,
    children: rows
      .filter((c: any) => c.parent_id === p.id)
      .map((c: any) => ({ id: c.id, name: c.name })),
  }));
}

export type SupplyItem = {
  id: string;
  name: string;
  description: string | null;
  capability_type: string;
  category_code: string | null;
  price_raw: string | null;
};

export type RoleSupplies = {
  entity_code: string;
  products: SupplyItem[];
  services: SupplyItem[];
};

/** 读取供给侧能力，按主体 code 分组（来自 zhuli_supply_capabilities，即《供应能力.txt》） */
export async function fetchSupplyCapabilities(): Promise<Record<string, RoleSupplies>> {
  const supabase = createServerClient() as unknown as LooseClient;
  const { data: caps } = await supabase.from("zhuli_supply_capabilities").select(
    "id, name, description, capability_type, category_code, price_raw, entity_id"
  );
  if (!caps) return {};
  // 主体 code：查 zhuli_entities
  const { data: ents } = await supabase.from("zhuli_entities").select("id, code");
  const codeByEntity = new Map<string, string>();
  (ents ?? []).forEach((e: any) => codeByEntity.set(e.id, e.code));

  const out: Record<string, RoleSupplies> = {};
  for (const c of caps as any[]) {
    const code = codeByEntity.get(c.entity_id);
    if (!code) continue;
    const item: SupplyItem = {
      id: c.id,
      name: c.name,
      description: c.description,
      capability_type: c.capability_type,
      category_code: c.category_code,
      price_raw: c.price_raw,
    };
    const bucket = c.capability_type === "product" ? "products" : "services";
    if (!out[code]) out[code] = { entity_code: code, products: [], services: [] };
    out[code][bucket].push(item);
  }
  return out;
}