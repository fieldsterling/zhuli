"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { useCartStore, itemPrice, totalPrice } from "@/store/cart";
import { useAuthStore } from "@/store/auth";

export default function CartPage() {
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const removeItem = useCartStore((s) => s.removeItem);
  const setQty = useCartStore((s) => s.setQty);
  const user = useAuthStore((s) => s.user);

  function checkout() {
    if (items.length === 0) return;
    if (!user) {
      router.push("/login");
      return;
    }
    router.push("/checkout");
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center px-5 pt-24">
        <p className="text-base font-medium">购物车是空的</p>
        <p className="mt-2 text-sm text-muted">去逛逛，把心仪的商品加进来吧</p>
        <Link
          href="/products"
          className="mt-6 rounded-xl bg-primary px-6 py-2.5 font-medium text-primary-foreground"
        >
          去逛逛
        </Link>
      </div>
    );
  }

  const total = totalPrice(items);

  return (
    <div className="px-5 pt-8 pb-28">
      <h1 className="text-xl font-semibold">购物车</h1>
      <p className="mt-1 text-sm text-muted">共 {items.length} 种商品</p>

      <div className="mt-5 space-y-3">
        {items.map((item) => (
          <div key={item.product.id} className="glass flex gap-3 p-3">
            {/* 图片 */}
            <Link href={`/products/${item.product.id}`} className="shrink-0">
              {item.product.images?.[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.product.images[0]}
                  alt={item.product.title}
                  className="h-20 w-20 rounded-lg object-cover"
                />
              ) : (
                <div className="h-20 w-20 rounded-lg bg-black/5" />
              )}
            </Link>
            {/* 信息 */}
            <div className="flex min-w-0 flex-1 flex-col justify-between py-1">
              <div className="flex items-start justify-between gap-2">
                <Link
                  href={`/products/${item.product.id}`}
                  className="line-clamp-2 text-sm font-medium"
                >
                  {item.product.title}
                </Link>
                <button
                  onClick={() => removeItem(item.product.id)}
                  className="text-muted transition-colors hover:text-danger"
                  aria-label="移除"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gold text-sm font-semibold">
                  ¥{(item.product.platform_price ?? item.product.supply_price).toLocaleString()}
                </span>
                <div className="glass flex items-center gap-1 px-1">
                  <button
                    onClick={() => setQty(item.product.id, item.quantity - 1)}
                    className="flex h-7 w-7 items-center justify-center text-lg"
                  >
                    −
                  </button>
                  <span className="w-6 text-center text-sm">{item.quantity}</span>
                  <button
                    onClick={() => setQty(item.product.id, item.quantity + 1)}
                    className="flex h-7 w-7 items-center justify-center text-lg"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 底部结算栏 */}
      <div className="fixed inset-x-0 bottom-0 z-40 lg:bottom-6">
        <div className="glass m-3 flex items-center justify-between rounded-2xl p-3">
          <div className="flex flex-col">
            <span className="text-xs text-muted">合计</span>
            <span className="text-lg font-semibold text-primary">
              ¥{total.toLocaleString()}
            </span>
          </div>
          <button
            onClick={checkout}
            className="rounded-xl bg-primary px-8 py-3 font-medium text-primary-foreground"
          >
            去结算
          </button>
        </div>
      </div>
    </div>
  );
}