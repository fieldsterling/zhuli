import { createServerClient } from "@/lib/supabase";

// zhuli_site_config 为宽松表，用宽松客户端访问
type LooseClient = { from: (table: string) => any };

export type RecConfig = {
  /** 商品列表 /products 与首页是否按用户行为权重排序 */
  behavior_products: boolean;
};

export const DEFAULT_REC: RecConfig = { behavior_products: false };

/** 读取推荐设置（供服务端页面消费；非管理员只读默认值） */
export async function getRecConfig(): Promise<RecConfig> {
  try {
    const s = createServerClient() as unknown as LooseClient;
    const { data } = await s
      .from("zhuli_site_config")
      .select("value")
      .eq("key", "rec")
      .maybeSingle();
    const v = data?.value;
    if (!v || typeof v !== "object") return DEFAULT_REC;
    return { behavior_products: !!v.behavior_products };
  } catch {
    return DEFAULT_REC;
  }
}