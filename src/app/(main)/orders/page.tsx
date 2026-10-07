"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase";
import { useAuthStore } from "@/store/auth";
import { orderStatusLabel, orderStatusColor } from "@/lib/order-status";
import type { Database } from "@/types/supabase";

type Order = Database["public"]["Tables"]["zhuli_orders"]["Row"];

export default function OrdersPage() {
  const router = useRouter();
  const supabase = createBrowserClient();
  const user = useAuthStore((s) => s.user);

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    let active = true;
    supabase
      .from("zhuli_orders")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (!active) return;
        setOrders((data ?? []) as Order[]);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [supabase, user]);

  if (loading) {
    return (
      <div className="px-5 pt-8">
        <div className="h-6 w-24 animate-pulse rounded bg-black/8" />
        <div className="mt-4 space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="glass h-24 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center px-5 pt-24">
        <p className="text-sm text-muted">请先登录查看订单</p>
        <button
          onClick={() => router.push("/login")}
          className="mt-4 rounded-xl bg-primary px-6 py-2.5 font-medium text-primary-foreground"
        >
          去登录
        </button>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center px-5 pt-24">
        <p className="text-base font-medium">还没有订单</p>
        <Link
          href="/products"
          className="mt-6 rounded-xl bg-primary px-6 py-2.5 font-medium text-primary-foreground"
        >
          去逛逛
        </Link>
      </div>
    );
  }

  return (
    <div className="px-5 pt-8 pb-6">
      <h1 className="text-xl font-semibold">我的订单</h1>
      <p className="mt-1 text-sm text-muted">共 {orders.length} 笔</p>

      <div className="mt-5 space-y-3">
        {orders.map((o) => (
          <Link
            key={o.id}
            href={`/orders/${o.id}`}
            className="glass block p-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted">{o.order_no}</span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${orderStatusColor(o.status)}`}
              >
                {orderStatusLabel(o.status)}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-sm text-muted">订单金额</span>
              <span className="text-lg font-semibold text-primary">
                ¥{Number(o.total_amount ?? 0).toLocaleString()}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-muted">{o.type}</span>
              <span className="text-xs text-muted">
                {new Date(o.created_at).toLocaleString("zh-CN", {
                  month: "2-digit",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}