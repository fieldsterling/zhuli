"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase";
import { useAuthStore } from "@/store/auth";
import type { Database } from "@/types/supabase";

type Supplier = Database["public"]["Tables"]["zhuli_suppliers"]["Row"];
type Product = Database["public"]["Tables"]["zhuli_products"]["Row"];

const statusLabels: Record<string, string> = {
  pending: "待审核",
  approved: "已审核",
  listed: "已上架",
  rejected: "已驳回",
  off_shelf: "已下架",
};

export default function SupplierDashboardPage() {
  const supabase = createBrowserClient();
  const user = useAuthStore((s) => s.user);
  const router = useRouter();

  const [supplier, setSupplier] = useState<Supplier | null | undefined>(undefined);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    // 查当前用户是否为供应商
    supabase
      .from("zhuli_suppliers")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle()
      .then(({ data }) => {
        setSupplier((data ?? null) as Supplier | null);
        return data ?? null;
      })
      .then(async (sup) => {
        if (sup) {
          const { data } = await supabase
            .from("zhuli_products")
            .select("*")
            .eq("supplier_id", sup.id)
            .order("created_at", { ascending: false });
          setProducts((data ?? []) as Product[]);
        }
        setLoading(false);
      });
  }, [supabase, user]);

  if (loading) {
    return (
      <div className="p-5">
        <div className="h-6 w-40 animate-pulse rounded bg-black/8" />
        <div className="mt-4 h-32 animate-pulse rounded-2xl bg-black/5" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center px-5 pt-24">
        <p className="text-sm text-muted">请先登录</p>
        <button
          onClick={() => router.push("/login")}
          className="mt-4 rounded-xl bg-primary px-6 py-2.5 font-medium text-primary-foreground"
        >
          去登录
        </button>
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="flex flex-col items-center px-5 pt-24 text-center">
        <h1 className="text-lg font-semibold">您还不是供应商</h1>
        <p className="mt-2 text-sm text-muted">
          请先完成供应商入驻申请，审核通过后即可上传商品
        </p>
        <button
          onClick={() => router.push("/supplier/apply")}
          className="mt-6 rounded-xl bg-primary px-6 py-2.5 font-medium text-primary-foreground"
        >
          申请入驻
        </button>
      </div>
    );
  }

  const pendingCount = products.filter((p) => p.status === "pending").length;

  return (
    <div className="p-5">
      {/* 顶部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{supplier.name}</h1>
          <p className="mt-0.5 text-sm text-muted">供应商工作台</p>
        </div>
        <Link
          href="/supplier/products/upload"
          className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          上传商品
        </Link>
      </div>

      {/* 概览卡片 */}
      <div className="mt-5 grid grid-cols-3 gap-3">
        <StatCard label="我的商品" value={products.length} />
        <StatCard label="待审核" value={pendingCount} />
        <StatCard label="已上架" value={products.filter((p) => p.status === "listed").length} />
      </div>

      {/* 商品列表 */}
      <h2 className="mt-7 text-base font-semibold">商品列表</h2>
      {products.length === 0 ? (
        <p className="mt-4 text-sm text-muted">暂无商品，点击右上角「上传商品」开始</p>
      ) : (
        <div className="mt-3 space-y-3">
          {products.map((p) => (
            <div key={p.id} className="glass flex items-center gap-3 p-3">
              {p.images?.[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.images[0]}
                  alt={p.title}
                  className="h-16 w-16 rounded-lg object-cover"
                />
              ) : (
                <div className="h-16 w-16 rounded-lg bg-black/5" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{p.title}</p>
                <p className="mt-0.5 text-xs text-muted">
                  ¥{Number(p.supply_price).toLocaleString()}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-xs ${
                  p.status === "listed"
                    ? "bg-emerald-500/10 text-emerald-600"
                    : "bg-amber-500/10 text-amber-600"
                }`}
              >
                {statusLabels[p.status] ?? p.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="glass px-3 py-4 text-center">
      <p className="text-xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-muted">{label}</p>
    </div>
  );
}