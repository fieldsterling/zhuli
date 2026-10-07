"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createOrder } from "@/app/actions/order";
import { useCartStore, itemPrice } from "@/store/cart";
import { useAuthStore } from "@/store/auth";

const addressSchema = z.object({
  receiver: z.string().min(2, "请输入收货人姓名"),
  phone: z.string().regex(/^1\d{10}$/, "请输入 11 位手机号"),
  province: z.string().min(1, "请输入省份"),
  city: z.string().min(1, "请输入城市"),
  detail: z.string().min(5, "请输入详细地址"),
});
type AddressData = z.infer<typeof addressSchema>;

export default function CheckoutPage() {
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const buyNow = useCartStore((s) => s.buyNow);
  const clear = useCartStore((s) => s.clear);
  const user = useAuthStore((s) => s.user);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const effectiveItems = buyNow
    ? [{ product: buyNow, quantity: 1 }]
    : items;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AddressData>({ resolver: zodResolver(addressSchema) });

  useEffect(() => {
    if (!user) router.replace("/login");
    if (effectiveItems.length === 0 && !buyNow) router.replace("/cart");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (effectiveItems.length === 0) {
    return (
      <div className="flex flex-col items-center px-5 pt-24">
        <p className="text-sm text-muted">没有待结算的商品</p>
      </div>
    );
  }

  const total = effectiveItems.reduce((sum, i) => sum + itemPrice(i), 0);

  async function onSubmit(data: AddressData) {
    setSubmitting(true);
    setError("");
    const address = `${data.province}${data.city}${data.detail}`;
    // buyNow 单件下单
    if (buyNow) {
      const res = await createOrder({
        items: [
          {
            productId: buyNow.id,
            title: buyNow.title,
            quantity: 1,
            unitPrice: buyNow.platform_price ?? buyNow.supply_price,
            image: buyNow.images?.[0] ?? null,
          },
        ],
        address,
        receiver: data.receiver,
        phone: data.phone,
      });
      setSubmitting(false);
      if (res.error) {
        setError(res.error);
        return;
      }
      clear();
      router.push(`/orders/${res.orderId}`);
      router.refresh();
      return;
    }
    // 购物车批量下单
    const res = await createOrder({
      items: items.map((i) => ({
        productId: i.product.id,
        title: i.product.title,
        quantity: i.quantity,
        unitPrice: i.product.platform_price ?? i.product.supply_price,
        image: i.product.images?.[0] ?? null,
      })),
      address,
      receiver: data.receiver,
      phone: data.phone,
    });
    setSubmitting(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    clear();
    router.push(`/orders/${res.orderId}`);
    router.refresh();
  }

  return (
    <div className="px-5 pt-8 pb-32">
      <button onClick={() => router.back()} className="text-sm text-muted">
        ← 返回
      </button>
      <h1 className="mt-2 text-xl font-semibold">确认订单</h1>

      {/* 收货地址 */}
      <section className="mt-5">
        <h2 className="text-sm font-medium text-muted">收货信息</h2>
        <div className="glass mt-2 p-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <input
                className="w-full bg-transparent px-3 py-2 text-sm outline-none"
                placeholder="收货人"
                {...register("receiver")}
              />
              {errors.receiver && (
                <p className="mx-3 mt-1 text-xs text-danger">{errors.receiver.message}</p>
              )}
            </div>
            <div>
              <input
                type="tel"
                inputMode="tel"
                className="w-full bg-transparent px-3 py-2 text-sm outline-none"
                placeholder="手机号"
                {...register("phone")}
              />
              {errors.phone && (
                <p className="mx-3 mt-1 text-xs text-danger">{errors.phone.message}</p>
              )}
            </div>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <input
              className="w-full bg-transparent px-3 py-2 text-sm outline-none"
              placeholder="省份"
              {...register("province")}
            />
            <input
              className="w-full bg-transparent px-3 py-2 text-sm outline-none"
              placeholder="城市"
              {...register("city")}
            />
          </div>
          <div className="mt-2">
            <input
              className="w-full bg-transparent px-3 py-2 text-sm outline-none"
              placeholder="详细地址（街道/门牌）"
              {...register("detail")}
            />
            {errors.detail && (
              <p className="mx-3 mt-1 text-xs text-danger">{errors.detail.message}</p>
            )}
          </div>
        </div>
      </section>

      {/* 商品清单 */}
      <section className="mt-6">
        <h2 className="text-sm font-medium text-muted">商品清单</h2>
        <div className="mt-2 space-y-3">
          {effectiveItems.map((item) => (
            <div key={item.product.id} className="glass flex gap-3 p-3">
              {item.product.images?.[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.product.images[0]}
                  alt={item.product.title}
                  className="h-16 w-16 shrink-0 rounded-lg object-cover"
                />
              ) : (
                <div className="h-16 w-16 shrink-0 rounded-lg bg-black/5" />
              )}
              <div className="flex min-w-0 flex-1 flex-col justify-between">
                <p className="line-clamp-2 text-sm font-medium">{item.product.title}</p>
                <div className="flex items-center justify-between">
                  <span className="text-gold text-sm font-semibold">
                    ¥{(item.product.platform_price ?? item.product.supply_price).toLocaleString()}
                  </span>
                  <span className="text-xs text-muted">×{item.quantity}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 金额 */}
      <section className="mt-6">
        <div className="glass p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted">商品金额</span>
            <span>¥{total.toLocaleString()}</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-muted">运费</span>
            <span>免运费</span>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-black/5 pt-3">
            <span className="text-sm font-medium">应付金额</span>
            <span className="text-lg font-semibold text-primary">
              ¥{total.toLocaleString()}
            </span>
          </div>
        </div>
      </section>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}

      {/* 提交下单 */}
      <button
        onClick={handleSubmit(onSubmit)}
        disabled={submitting}
        className="mt-6 w-full rounded-2xl bg-primary py-3.5 font-medium text-primary-foreground disabled:opacity-50"
      >
        {submitting ? "提交中…" : `提交订单 ¥${total.toLocaleString()}`}
      </button>
    </div>
  );
}