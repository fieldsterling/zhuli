"use client";

import Link from "next/link";
import { track } from "@/lib/track";

/** 商品卡片：点击上报 product_view（带商品 id / 品类） */
export function TrackedProductCard({
  href,
  id,
  category,
  className,
  children,
}: {
  href: string;
  id: string;
  category?: string | null;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={className}
      onClick={() =>
        track({
          event_type: "product_view",
          target_type: "product",
          target_id: id,
          category_code: category ?? undefined,
          source: "products",
        })
      }
    >
      {children}
    </Link>
  );
}