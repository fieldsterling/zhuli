import Link from "next/link";
import { createServerClient } from "@/lib/supabase";
import { getServerUser } from "@/lib/server-user";
import { getRecConfig } from "@/lib/rec";
import { SearchBox } from "@/components/search-box";
import { TrackedProductCard } from "@/components/tracked-product-card";
import { TrackPageView } from "@/components/track-page-view";

export const dynamic = "force-dynamic";

// 生成的 Database 类型尚未包含行为权重表，沿用宽松客户端访问
type LooseClient = { from: (table: string) => any };

/** 商品列表：服务端一次取数直出（不发客户端请求），支持 ?q= 关键词过滤 */
export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const sp = await searchParams;
  const kw = (sp?.q ?? "").trim();
  const supabase = createServerClient();
  let query = supabase
    .from("zhuli_products")
    .select("id, title, images, category, supply_price, platform_price, weight_grams")
    .eq("status", "listed")
    .order("created_at", { ascending: false })
    .limit(50);

  if (kw) {
    query = query.ilike("title", `%${kw}%`);
  }

  const { data } = await query;

  const raw = (data ?? []) as any[];

  // 若后台开启「按行为权重排序」：登录用户把自己常看的品类排前面（未开启/未登录保持时间序）
  let products = raw;
  try {
    const rec = await getRecConfig();
    if (rec.behavior_products) {
      const user = await getServerUser();
      if (user) {
        const loose = supabase as unknown as LooseClient;
        const { data: iw } = await loose
          .from("zhuli_interest_weights")
          .select("key_id")
          .eq("user_id", user.id)
          .eq("scope", "category")
          .gt("weight", 0)
          .order("weight", { ascending: false })
          .limit(30);
        const cats = Array.from(new Set((iw ?? []).map((r: any) => r.key_id))) as string[];
        if (cats.length) {
          products = [...raw];
          products.sort((a: any, b: any) => {
            const ra = cats.indexOf(a.category);
            const rb = cats.indexOf(b.category);
            if (ra === -1 && rb === -1) return 0;
            if (ra === -1) return 1;
            if (rb === -1) return -1;
            return ra - rb;
          });
        }
      }
    }
  } catch {
    /* 配置读取失败则忽略，保持默认排序 */
  }

  return (
    <div className="px-5 pt-8 pb-6">
      <TrackPageView
        event_type={kw ? "search" : "page_view"}
        source={kw ? "products-search" : "products"}
        meta={kw ? { keyword: kw } : undefined}
      />
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{kw ? `“${kw}” 的搜索结果` : "全部商品"}</h1>
        <Link href="/" className="text-sm text-muted">返回首页</Link>
      </div>
      <div className="mt-4">
        <SearchBox placeholder="在全部商品中搜索…" initial={kw} />
      </div>

      {products.length === 0 ? (
        <p className="mt-10 text-center text-sm text-muted">
          {kw ? `没有找到与“${kw}”相关的商品` : "暂无上架商品，敬请期待"}
        </p>
      ) : (
        <div className="mt-5 grid grid-cols-2 gap-4">
          {products.map((p) => {
            const price = p.platform_price ?? p.supply_price;
            const cover = p.images?.[0];
            return (
              <TrackedProductCard
                key={p.id}
                href={`/products/${p.id}`}
                id={p.id}
                category={p.category}
                className="glass overflow-hidden p-2"
              >
                {cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={cover}
                    alt={p.title}
                    className="aspect-square w-full rounded-xl object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="aspect-square w-full rounded-xl bg-black/5" />
                )}
                <div className="mt-2 space-y-1 px-1 pb-1">
                  <p className="truncate text-sm font-medium">{p.title}</p>
                  <p className="flex items-center gap-1.5 text-sm">
                    <span className="text-gold font-semibold">
                      ¥{Number(price).toLocaleString()}
                    </span>
                    {p.weight_grams != null && (
                      <span className="text-xs text-muted">{p.weight_grams}g</span>
                    )}
                  </p>
                </div>
              </TrackedProductCard>
            );
          })}
        </div>
      )}
    </div>
  );
}