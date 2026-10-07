"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { track } from "@/lib/track";
import { uploadToCos } from "@/lib/upload";

/** 可输入的顶层搜索框：回车/点击跳转到 /products?q= */
export function SearchBox({
  placeholder = "搜索商品、服务…",
  initial = "",
}: {
  placeholder?: string;
  initial?: string;
}) {
  const router = useRouter();
  const [q, setQ] = useState(initial);
  const fileRef = useRef<HTMLInputElement>(null);
  const [imgBusy, setImgBusy] = useState(false);

  function go() {
    const kw = q.trim();
    if (kw) track({ event_type: "search", target_type: "product", meta: { keyword: kw } });
    router.push(kw ? `/products?q=${encodeURIComponent(kw)}` : "/products");
  }

  async function onImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImgBusy(true);
    try {
      const url = await uploadToCos(file, "product");
      router.push(`/image-search?img=${encodeURIComponent(url)}`);
    } catch (err) {
      alert((err as Error).message || "上传失败");
    } finally {
      setImgBusy(false);
    }
  }

  return (
    <form
      className="glass flex w-full items-center gap-2 rounded-full px-4 py-3 text-sm"
      onSubmit={(e) => {
        e.preventDefault();
        go();
      }}
    >
      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0 text-gold" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3-3" />
      </svg>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        enterKeyHint="search"
        className="w-full bg-transparent outline-none placeholder:text-muted"
      />
      {q && (
        <button type="button" className="shrink-0 text-muted" aria-label="清除" onClick={() => setQ("")}>
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="1.8">
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </button>
      )}
      {/* 以图搜图：上传图片识别 */}
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={imgBusy}
        aria-label="以图搜图"
        className="ml-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full gold-ring disabled:opacity-50"
      >
        {imgBusy ? (
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 animate-spin text-gold" stroke="currentColor" strokeWidth="1.8">
            <path d="M21 12a9 9 0 1 1-9-9" strokeLinecap="round" />
            <path d="M12 3v4" strokeLinecap="round" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-gold" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3.5" y="3.5" width="17" height="17" rx="3" />
            <circle cx="9" cy="9" r="1.8" />
            <path d="m5 17 4.5-4.5 3 3L16 12l3 3" />
          </svg>
        )}
      </button>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onImage} />
      {/* 筛选钮：跳转全部商品 */}
      <button
        type="button"
        onClick={() => router.push("/products")}
        aria-label="筛选"
        className="ml-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full gold-ring"
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M3 6h10M21 6h0M13 6a3 3 0 1 0 6 0 3 3 0 0 0-6 0Z" />
          <path d="M21 18H11M3 18h0M11 18a3 3 0 1 0-6 0 3 3 0 0 0 6 0Z" />
        </svg>
      </button>
    </form>
  );
}