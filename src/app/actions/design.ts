"use server";

import { createServerClient } from "@/lib/supabase";
import { getServerUser } from "@/lib/server-user";

// 生成的 Database 类型尚未包含设计服务单表，用宽松客户端访问
type LooseClient = { from: (table: string) => any };

const FIELDS = ["category", "material", "weight", "budget", "style", "purpose", "engraving", "notes"] as const;
const CATEGORIES = ["戒指", "项链", "吊坠", "耳饰", "手镯", "情侣对"];

function clamp(v: unknown, max: number): string | null {
  return typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;
}

/** 提交一条设计定制需求单。需登录；字段白名单 + 非空校验（品类必选）。 */
export async function submitDesignRequest(input: {
  category?: string;
  material?: string;
  weight?: string;
  budget?: string;
  style?: string;
  purpose?: string;
  engraving?: string;
  notes?: string;
  ref_images?: string[];
}) {
  const user = await getServerUser();
  if (!user) return { error: "请先登录后再提交" };

  const category = clamp(input.category, 20) ?? "";
  if (!CATEGORIES.includes(category)) return { error: "请选择想定制的品类" };

  const row: Record<string, unknown> = { user_id: user.id, category };
  for (const f of FIELDS) {
    if (f !== "category" && input[f] != null && String(input[f]).trim()) {
      row[f] = clamp(input[f] as unknown, f === "notes" ? 1000 : 120);
    }
  }
  // 参考图：仅保存 https 开头的 COS 公开 URL，限制数量/长度
  if (Array.isArray(input.ref_images)) {
    const urls = input.ref_images
      .filter((u) => typeof u === "string" && /^https:\/\//.test(u) && u.length < 512)
      .slice(0, 6);
    if (urls.length) row.ref_images = urls;
  }

  const server = createServerClient() as unknown as LooseClient;
  const { data, error } = await server.from("zhuli_design_requests").insert(row).select("id").single();
  if (error) return { error: "提交失败：" + error.message };

  return { ok: true, id: data?.id ?? null };
}