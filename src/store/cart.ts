"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Database } from "@/types/supabase";

export type CartProduct = Pick<
  Database["public"]["Tables"]["zhuli_products"]["Row"],
  "id" | "title" | "images" | "supply_price" | "platform_price" | "stock"
>;

export interface CartItem {
  product: CartProduct;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  /** 立即购买：结算完成后清空该 key 的单项 */
  buyNow: CartProduct | null;
  addItem: (p: CartProduct, qty?: number) => void;
  removeItem: (productId: string) => void;
  setQty: (productId: string, qty: number) => void;
  clear: () => void;
  setBuyNow: (p: CartProduct | null) => void;
}

function priceOf(p: CartProduct): number {
  return p.platform_price ?? p.supply_price ?? 0;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      buyNow: null,
      addItem: (p, qty = 1) =>
        set((s) => {
          const existing = s.items.find((i) => i.product.id === p.id);
          if (existing) {
            return {
              items: s.items.map((i) =>
                i.product.id === p.id
                  ? { ...i, quantity: Math.min(i.quantity + qty, i.product.stock || 99) }
                  : i
              ),
            };
          }
          return {
            items: [...s.items, { product: p, quantity: Math.min(qty, p.stock || 1) }],
          };
        }),
      removeItem: (productId) =>
        set((s) => ({
          items: s.items.filter((i) => i.product.id !== productId),
        })),
      setQty: (productId, qty) =>
        set((s) => ({
          items: s.items.map((i) =>
            i.product.id === productId
              ? { ...i, quantity: Math.max(1, Math.min(qty, i.product.stock || 99)) }
              : i
          ),
        })),
      clear: () => set({ items: [], buyNow: null }),
      setBuyNow: (p) => set({ buyNow: p }),
    }),
    { name: "zhuli-cart" }
  )
);

/** 计算一项的价格 */
export function itemPrice(item: CartItem): number {
  return priceOf(item.product) * item.quantity;
}

/** 全局购物车总额（buyNow 单件时只算该项） */
export function totalPrice(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + itemPrice(i), 0);
}