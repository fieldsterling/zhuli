import { Suspense } from "react";
import Link from "next/link";
import { BusinessEntryGrid } from "@/components/business-entry-grid";
import { HeaderLoginButton } from "@/components/header-login-button";
import { HotProducts } from "@/components/hot-products";
import { SearchBox } from "@/components/search-box";
import { ServiceGrid } from "@/components/service-grid";
import { TrackPageView } from "@/components/track-page-view";
import { getHomeBg } from "@/lib/site-config";

export const dynamic = "force-dynamic";

function HotProductsSkeleton() {
  return (
    <div className="-mx-5 mt-4 flex gap-3 overflow-hidden px-5">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="w-40 shrink-0">
          <div className="glass overflow-hidden p-2">
            <div className="aspect-square w-full animate-pulse rounded-xl bg-black/5" />
            <div className="mt-2 space-y-1.5 px-1">
              <div className="h-3 w-3/4 rounded bg-black/8" />
              <div className="h-3 w-1/2 rounded bg-black/6" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// 信任条（3 列金线图标）
function TrustStrip() {
  const items = [
    { t: "正品保障", d: "国检权威认定" },
    { t: "水贝直供", d: "源头一手价" },
    { t: "售后无忧", d: "全程贴心服务" },
  ];
  return (
    <section className="mt-7 px-5">
      <div className="glass flex items-stretch rounded-2xl px-3 py-4">
        {items.map((it, i) => (
          <div
            key={it.t}
            className={
              "flex flex-1 flex-col items-center gap-1.5 " +
              (i > 0 ? "border-l border-black/5" : "")
            }
          >
            <span className="flex h-7 w-7 items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-muted" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                {i === 0 && <path d="M12 3 5 5.5V11c0 4 3 7.5 7 9 4-1.5 7-5 7-9V5.5L12 3Z" />}
                {i === 0 && <path d="m9.2 11.6 2 2 3.6-3.8" />}
                {i === 1 && <path d="M12 21s-6-4.6-6-9a6 6 0 1 1 12 0c0 4.4-6 9-6 9Z" />}
                {i === 1 && <circle cx="12" cy="12" r="2.5" />}
                {i === 2 && <path d="M12 7v6M8.5 10.5h7" />}
                {i === 2 && <circle cx="12" cy="12" r="9" />}
              </svg>
            </span>
            <span className="text-sm font-medium">{it.t}</span>
            <span className="text-[11px] text-muted">{it.d}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function Hero({ bg }: { bg: string | null }) {
  return (
    <section className="px-5 pt-6">
      <div className="relative aspect-[4/5] max-h-[460px] w-full overflow-hidden rounded-3xl">
        {/* 暖色渐变底座（无背景图时兜底） */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#fdf7ea] via-[#f6efdf] to-[#ece0c6]" />
        {bg && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={bg} alt="" className="absolute inset-0 h-full w-full object-cover" />
        )}
        <div className="absolute inset-0 hero-tint" />
        {/* 文案 */}
        <div className="absolute inset-0 flex flex-col justify-end p-5">
          <p className="text-[11px] font-medium tracking-[0.3em] text-gold">SHUIBEI · JEWELRY</p>
          <h2 className="mt-1 serif text-[28px] font-semibold leading-snug">
            珠宝，从源头开始
          </h2>
          <p className="mt-2 text-sm text-muted">水贝源头直供 · 一手批发价</p>
        </div>
      </div>
    </section>
  );
}

export default async function HomePage() {
  const homeBg = await getHomeBg();

  return (
    <div className="min-h-screen">
      <TrackPageView event_type="page_view" source="home" />

      {/* 顶部品牌区 */}
      <header className="flex items-center justify-between px-5 pt-8 pb-3">
        <div>
          <h1 className="serif text-2xl font-semibold tracking-tight">珠宝助理</h1>
          <p className="mt-1 flex items-center gap-1 text-sm text-muted">
            <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 text-gold" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 21s-6-4.6-6-9a6 6 0 1 1 12 0c0 4.4-6 9-6 9Z" />
              <circle cx="12" cy="12" r="2.5" />
            </svg>
            水贝源头 · 一站式珠宝服务
          </p>
        </div>
        <HeaderLoginButton />
      </header>

      {/* Hero 大图 + Slogan（背景图后台可替换） */}
      <Hero bg={homeBg} />

      {/* 搜索（胶囊 + 筛选） */}
      <div className="mt-5 px-5">
        <SearchBox />
      </div>

      {/* 业务直通车：4 个具体业务场景入口（2×2 大卡），与搜索同属行动区，间距收紧 */}
      <section className="mt-6 px-5">
        <BusinessEntryGrid />
      </section>

      {/* 服务入口：两行 8 项，金色线性图标（换层级，拉开间距） */}
      <section className="mt-9 px-5">
        <ServiceGrid />
        <Link
          href="/services"
          className="mt-5 flex w-full items-center justify-center gap-1 rounded-full border border-black/8 py-2.5 text-sm font-medium text-muted"
        >
          更多服务
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="1.8">
            <path d="m9 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      </section>

      {/* 信任保障 */}
      <TrustStrip />

      {/* 热门商品（横滑） */}
      <section className="mt-9">
        <div className="flex items-center justify-between px-5">
          <h2 className="serif text-lg font-semibold">热门精选</h2>
          <Link href="/products" className="text-sm text-muted">
            查看全部
          </Link>
        </div>
        <Suspense fallback={<HotProductsSkeleton />}>
          <HotProducts />
        </Suspense>
      </section>

      <div className="h-6" />
    </div>
  );
}