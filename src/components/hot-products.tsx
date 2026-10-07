import Link from "next/link";
import { createServerClient } from "@/lib/supabase";
import { getServerUser } from "@/lib/server-user";

// 生成的 Database 类型尚未包含目录/主体相关表，沿用宽松客户端访问
type LooseClient = { from: (table: string) => any };

function priceShort(p: Record<string, any>) {
  const num = (v: any) => (v == null ? null : Number(v).toLocaleString("zh-CN"));
  const min = num(p.price_min);
  const max = num(p.price_max);
  if (min != null && max != null) return `¥${min} ~ ¥${max}`;
  return (p.price_raw as string) || "参考价待更新";
}

/** 目录商品卡片：无图片，用首字符占位，展示名称 + 参考价区间 */
function CatalogCard({ p }: { p: Record<string, any> }) {
  return (
    <div className="glass overflow-hidden p-2">
      <div className="flex aspect-square w-full items-center justify-center rounded-xl bg-primary/10">
        <span className="text-2xl font-semibold text-primary">{String(p.name || "珠").slice(0, 1)}</span>
      </div>
      <div className="mt-2 space-y-1 px-1 pb-1">
        <p className="truncate text-sm font-medium">{p.name}</p>
        <p className="truncate text-sm font-semibold text-gold">{priceShort(p)}</p>
      </div>
    </div>
  );
}

/**
 * 首页热门商品：服务端一次取数直出。
 * 已登录且被管理员标注了主体标签的用户 → 展示与其主体相关的已上架目录商品；
 * 未登录 / 无主体标签 / 无匹配商品 → 回退展示平台已上架交易商品。
 */
export async function HotProducts() {
  const supabase = createServerClient() as unknown as LooseClient;
  const user = await getServerUser();

  // 用户兴趣：权重最高的品类（登录且有沉淀，作为无主体标签时的推荐排序依据）
  let interestCats: string[] = [];
  if (user) {
    const { data: iw } = await supabase
      .from("zhuli_interest_weights")
      .select("key_id")
      .eq("user_id", user.id)
      .eq("scope", "category")
      .gt("weight", 0)
      .order("weight", { ascending: false })
      .limit(6);
    interestCats = Array.from(new Set((iw ?? []).map((r: any) => r.key_id)));
  }

  if (user) {
    const { data: ues } = await supabase.from("zhuli_user_entities").select("entity_id").eq("user_id", user.id);
    const entityIds: string[] = Array.from(new Set((ues ?? []).map((r: any) => r.entity_id)));
    if (entityIds.length) {
      const { data: rels } = await supabase
        .from("zhuli_catalog_product_entities")
        .select("product_id")
        .in("entity_id", entityIds);
      const pids: string[] = Array.from(new Set((rels ?? []).map((r: any) => r.product_id)));
      if (pids.length) {
        const { data: prods } = await supabase
          .from("zhuli_catalog_products")
          .select("id, name, hw_type, price_min, price_max, price_raw, price_period")
          .eq("status", "listed")
          .in("id", pids);
        if (prods && prods.length) {
          return (
            <Carousel>
              {prods.slice(0, 8).map((p: any) => (
                <div key={p.id} className="w-40 shrink-0 snap-start">
                  <CatalogCard p={p} />
                </div>
              ))}
            </Carousel>
          );
        }
      }
    }
  }

  // 「我的偏好」：offer 用户按其自选的可提供类别，推相关已上架目录商品
  if (user) {
    const { data: entry } = await supabase.from("zhuli_user_entry").select("*").eq("user_id", user.id).maybeSingle();
    const offerCats: string[] = Array.isArray(entry?.offer_categories) ? entry.offer_categories : [];
    if (entry?.branch === "offer" && offerCats.length) {
      const { data: prods } = await supabase
        .from("zhuli_catalog_products")
        .select("id, name, hw_type, price_min, price_max, price_raw, price_period")
        .eq("status", "listed")
        .in("category_id", offerCats);
      if (prods && prods.length) {
        return (
          <Carousel>
            {prods.slice(0, 8).map((p: any) => (
              <div key={p.id} className="w-40 shrink-0 snap-start">
                <CatalogCard p={p} />
              </div>
            ))}
          </Carousel>
        );
      }
    }
  }

  // 兜底：平台已上架交易商品（有主体标签 / 自选偏好命中则在上面已返回，不会走到这）
  const { data } = await (supabase as unknown as LooseClient)
    .from("zhuli_products")
    .select("id, title, images, category, supply_price, platform_price")
    .eq("status", "listed")
    .order("created_at", { ascending: false })
    .limit(20);

  const products = (data ?? []).slice();
  // 兴趣权重排序：命中最常浏览品类的商品排前，其余（保持原有时间序）在后
  if (interestCats.length) {
    products.sort((a: any, b: any) => {
      const ra = interestCats.indexOf(a.category);
      const rb = interestCats.indexOf(b.category);
      if (ra === -1 && rb === -1) return 0;
      if (ra === -1) return 1;
      if (rb === -1) return -1;
      return ra - rb;
    });
  }

  if (products.length === 0) {
    return <p className="mt-6 text-sm text-muted">暂无上架商品，敬请期待</p>;
  }

  const shown = products.slice(0, 8);

  return (
    <Carousel>
      {shown.map((p: any) => {
        const price = p.platform_price ?? p.supply_price;
        return (
          <div key={p.id} className="w-40 shrink-0 snap-start">
            <Link href={`/products/${p.id}`} className="glass block overflow-hidden p-2 h-full">
              {p.images?.[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.images[0]}
                  alt={p.title}
                  className="aspect-square w-full rounded-xl object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="aspect-square w-full rounded-xl bg-black/5" />
              )}
              <div className="mt-2 space-y-1 px-1 pb-1">
                <p className="truncate text-sm font-medium">{p.title}</p>
                <p className="text-sm font-semibold text-gold">
                  ¥{Number(price).toLocaleString()}
                </p>
              </div>
            </Link>
          </div>
        );
      })}
    </Carousel>
  );
}

/** 横滑商品条：隐藏滚动条，卡片吸附 */
function Carousel({ children }: { children: React.ReactNode }) {
  return (
    <div className="-mx-5 mt-4 flex snap-x gap-3 overflow-x-auto px-5 pb-1 no-scrollbar">
      {children}
    </div>
  );
}