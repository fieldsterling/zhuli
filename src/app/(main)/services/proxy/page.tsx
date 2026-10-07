import Link from "next/link";
import { createServerClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/** 代购服务：上架商品集市，可直接下单由平台代购代发 */
export default async function ProxyPage() {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("zhuli_products")
    .select("id, title, images, supply_price, platform_price, weight_grams")
    .eq("status", "listed")
    .order("created_at", { ascending: false })
    .limit(50);

  const products = data ?? [];

  return (
    <div className="px-5 pt-8 pb-6">
      <div className="flex items-center gap-3">
        <Link href="/services" className="glass flex h-9 w-9 items-center justify-center rounded-full" aria-label="返回">
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.7">
            <path d="m15 6-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-semibold">代购</h1>
          <p className="text-xs text-muted">一手代购代发，直连水贝源头档口</p>
        </div>
      </div>

      {products.length === 0 ? (
        <p className="mt-12 text-center text-sm text-muted">
          暂无上架商品，敬请期待
          <br />
          <span className="mt-2 inline-block text-xs">你也可以发布找货需求，让买手帮你找</span>
        </p>
      ) : (
        <div className="mt-5 grid grid-cols-2 gap-4">
          {products.map((p) => {
            const price = p.platform_price ?? p.supply_price;
            const cover = p.images?.[0];
            return (
              <Link key={p.id} href={`/products/${p.id}`} className="glass overflow-hidden p-2">
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
                    <span className="font-semibold text-gold">¥{Number(price).toLocaleString()}</span>
                    {p.weight_grams != null && <span className="text-xs text-muted">{p.weight_grams}g</span>}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}