"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, ShoppingCart } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase";
import type { Database } from "@/types/supabase";
import { useAuthStore } from "@/store/auth";
import { useCartStore } from "@/store/cart";

type Product = Database["public"]["Tables"]["zhuli_products"]["Row"];

const categoryLabels: Record<string, string> = {};

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createBrowserClient();
  const user = useAuthStore((s) => s.user);
  const addToCart = useCartStore((s) => s.addItem);
  const setBuyNow = useCartStore((s) => s.setBuyNow);

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [imgIdx, setImgIdx] = useState(0);

  useEffect(() => {
    let active = true;
    if (!id) return;
    supabase
      .from("zhuli_products")
      .select("*")
      .eq("id", id)
      .eq("status", "listed")
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) setError(error.message);
        else setProduct((data ?? null) as Product | null);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [supabase, id]);

  if (loading) {
    return (
      <div className="px-5 pt-6">
        <div className="aspect-square w-full animate-pulse rounded-2xl bg-black/5" />
        <div className="mt-4 space-y-2">
          <div className="h-5 w-1/2 rounded bg-black/8" />
          <div className="h-4 w-3/4 rounded bg-black/6" />
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="flex flex-col items-center px-5 pt-24">
        <p className="text-sm text-danger">商品不存在或已下架</p>
      </div>
    );
  }

  const price = product.platform_price ?? product.supply_price;
  const images = product.images ?? [];

  const addCart = () => {
    const prod = product as NonNullable<typeof product>;
    addToCart({
      id: prod.id,
      title: prod.title,
      images: images,
      supply_price: prod.supply_price,
      platform_price: prod.platform_price,
      stock: prod.stock,
    });
  };

  const buy = () => {
    if (!user) {
      router.push("/login");
      return;
    }
    const prod = product as NonNullable<typeof product>;
    setBuyNow({
      id: prod.id,
      title: prod.title,
      images: images,
      supply_price: prod.supply_price,
      platform_price: prod.platform_price,
      stock: prod.stock,
    });
    router.push("/checkout");
  }

  return (
    <div className="pb-24">
      {/* 返回按钮 */}
      <button
        onClick={() => router.back()}
        className="glass absolute top-5 left-4 z-10 flex h-9 w-9 items-center justify-center rounded-full"
        aria-label="返回"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      {/* 图片区 */}
      <div className="relative aspect-square w-full overflow-hidden rounded-b-3xl bg-black/5">
        {images.length > 0 ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={images[imgIdx]}
            alt={product.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted">
            暂无图片
          </div>
        )}
        {images.length > 1 && (
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setImgIdx(i)}
                className={`h-2 rounded-full transition-all ${
                  i === imgIdx ? "w-5 bg-white" : "w-2 bg-white/60"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* 信息区 */}
      <div className="px-5 pt-5">
        <p className="text-xl font-semibold text-primary">
          ¥{Number(price).toLocaleString()}
        </p>
        <h1 className="mt-2 text-lg font-medium leading-snug">{product.title}</h1>

        <div className="mt-4 grid grid-cols-2 gap-3">
          {product.category && (
            <InfoItem label="品类" value={product.category} />
          )}
          {product.material && (
            <InfoItem label="材质" value={product.material} />
          )}
          {product.weight_grams != null && (
            <InfoItem label="克重" value={`${product.weight_grams}g`} />
          )}
          {product.stock != null && (
            <InfoItem label="库存" value={`${product.stock} 件`} />
          )}
        </div>
      </div>

      {/* 底部操作栏 */}
      <div className="fixed inset-x-0 bottom-0 z-40 lg:bottom-6">
        <div className="glass m-3 flex items-center gap-3 rounded-2xl p-2">
          <button
            onClick={addCart}
            className="glass flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
            aria-label="加入购物车"
          >
            <ShoppingCart className="h-5 w-5" />
          </button>
          <button
            onClick={buy}
            className="flex-1 rounded-xl bg-primary py-3 font-medium text-primary-foreground"
          >
            立即购买
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass px-4 py-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-0.5 text-sm font-medium">{value}</p>
    </div>
  );
}