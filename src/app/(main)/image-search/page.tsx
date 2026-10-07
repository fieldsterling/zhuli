"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { uploadToCos } from "@/lib/upload";
import { TrackPageView } from "@/components/track-page-view";

type ResultCard = {
  id: string;
  name: string;
  subtitle?: string | null;
  cover: string | null;
  images?: string[];
  price_raw?: string | null;
};

type SearchResult = {
  query_image: string;
  appearance: Array<{ product: ResultCard; score: number; matched_image: string | null }>;
  same_series: ResultCard[];
};

const SEARCH_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/zhuli_image_search`;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function SearchPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const [img, setImg] = useState<string | null>(null);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const q = sp.get("img");
    setImg(q ? decodeURIComponent(q) : null);
  }, [sp]);

  useEffect(() => {
    if (!img) return;
    let active = true;
    setLoading(true);
    setError("");
    setResult(null);
    fetch(SEARCH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${ANON_KEY}` },
      body: JSON.stringify({ image_url: img, limit: 30, threshold: 0.2 }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!active) return;
        if (!res.ok) {
          setError(data?.error || `请求失败 HTTP ${res.status}`);
          return;
        }
        setResult(data as SearchResult);
      })
      .catch((e) => active && setError((e as Error).message || "网络错误"))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [img]);

  async function onImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const url = await uploadToCos(file, "product");
      router.replace(`/image-search?img=${encodeURIComponent(url)}`);
    } catch (err) {
      alert((err as Error).message || "上传失败");
    }
  }

  return (
    <div className="px-5 pt-8 pb-6">
      <TrackPageView event_type="page_view" source="image-search" />
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">以图搜图</h1>
        <Link href="/" className="text-sm text-muted">返回首页</Link>
      </div>

      {/* 查询图 */}
      <div className="mt-4 flex items-center gap-3">
        <div className="glass flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-black/5">
          {img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={img} alt="查询图" className="h-full w-full object-cover" />
          ) : (
            <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 text-muted" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3.5" y="3.5" width="17" height="17" rx="3" />
              <circle cx="9" cy="9" r="1.8" />
              <path d="m5 17 4.5-4.5 3 3L16 12l3 3" />
            </svg>
          )}
        </div>
        <button
          onClick={() => fileRef.current?.click()}
          className="glass rounded-full px-4 py-2.5 text-sm font-medium"
        >
          上传图片识别
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onImage} />
      </div>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}

      {loading ? (
        <div className="mt-5 space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3">
              <div className="h-20 w-20 animate-pulse rounded-2xl bg-black/5" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-3.5 w-3/4 rounded bg-black/8" />
                <div className="h-3 w-1/2 rounded bg-black/6" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        result && (
          <div className="mt-6 space-y-8">
            <ResultSection
              title="外观相似"
              hint={`${result.appearance.length} 件 · 按相似度排序`}
              rows={result.appearance.map((a) => ({
                card: a.product,
                matched: a.matched_image ?? a.product.cover,
                score: a.score,
              }))}
            />
            {result.same_series.length > 0 && (
              <ResultSection
                title="同系列 · 同概念"
                hint={`${result.same_series.length} 件 · 基于标签维度`}
                rows={result.same_series.map((p) => ({ card: p, matched: p.cover, score: null }))}
              />
            )}
          </div>
        )
      )}
    </div>
  );
}

function ResultSection({
  title,
  hint,
  rows,
}: {
  title: string;
  hint: string;
  rows: Array<{ card: ResultCard; matched: string | null; score: number | null }>;
}) {
  return (
    <section>
      <div className="flex items-baseline justify-between">
        <h2 className="serif text-lg font-semibold">{title}</h2>
        <span className="text-xs text-muted">{hint}</span>
      </div>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-muted">暂无匹配结果</p>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-3">
          {rows.map(({ card, matched, score }) => (
            <div key={card.id} className="glass overflow-hidden p-2">
              {matched ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={matched} alt={card.name} className="aspect-square w-full rounded-xl object-cover" loading="lazy" />
              ) : (
                <div className="aspect-square w-full rounded-xl bg-black/5" />
              )}
              <div className="mt-2 space-y-1 px-1 pb-1">
                <p className="truncate text-sm font-medium">{card.name}</p>
                {card.subtitle && <p className="truncate text-xs text-muted">{card.subtitle}</p>}
                <div className="flex items-center justify-between">
                  {card.price_raw ? (
                    <span className="text-sm font-semibold text-gold">{card.price_raw}</span>
                  ) : (
                    <span />
                  )}
                  {score != null && (
                    <span className="text-[10px] text-muted">{Math.round(score * 100)}%</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default function ImageSearchPage() {
  return (
    <Suspense fallback={<div className="px-5 pt-8" />}>
      <SearchPage />
    </Suspense>
  );
}