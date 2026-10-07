"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/store/cart";

const tabs = [
  { href: "/", label: "首页", icon: HomeIcon },
  { href: "/products", label: "商品", icon: ProductsIcon },
  { href: "/cart", label: "购物车", icon: CartIcon },
  { href: "/orders", label: "订单", icon: OrderIcon },
  { href: "/profile", label: "我的", icon: MeIcon },
] as const;

export function BottomTabBar() {
  const pathname = usePathname();
  const cartCount = useCartStore((s) =>
    s.items.reduce((n, i) => n + i.quantity, 0)
  );
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 lg:hidden">
      <div className="glass pb-safe border-x-0 border-b-0 rounded-none border-t">
        <div className="flex items-stretch justify-around py-1.5">
          {tabs.map((tab) => {
            const active =
              pathname === tab.href ||
              (tab.href !== "/" && pathname.startsWith(tab.href));
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="relative flex min-w-0 flex-1 flex-col items-center gap-0.5 py-1"
              >
                {tab.href === "/cart" && cartCount > 0 && (
                  <span className="absolute right-[calc(50%-18px)] top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] leading-none text-white">
                    {cartCount > 99 ? "99+" : cartCount}
                  </span>
                )}
                <tab.icon
                  className={cn(
                    "h-6 w-6 transition-colors",
                    active ? "text-primary" : "text-muted"
                  )}
                />
                <span
                  className={cn(
                    "text-[11px] font-medium transition-colors",
                    active ? "text-primary" : "text-muted"
                  )}
                >
                  {tab.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.7">
      <path d="M3 10.5 12 3l9 7.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 9.5V21h4v-6h6v6h4V9.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function ProductsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.7">
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" />
    </svg>
  );
}
function CartIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.7">
      <path d="M3 4h2l2.2 11h11l2-7H6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="9.5" cy="19.5" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="17.5" cy="19.5" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}
function OrderIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.7">
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M9 9h6M9 13h4" strokeLinecap="round" />
    </svg>
  );
}
function MsgIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.7">
      <path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5c-1.6 0-3.1-.4-4.4-1.2L3 20l1.2-5.1A8.5 8.5 0 1 1 21 11.5Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function MeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.7">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20a7 7 0 0 1 14 0" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}