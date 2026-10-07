import Link from "next/link";
import { SERVICES } from "@/lib/services";

/** 单色简约线性图标（金色），2px 描边，与底部导航同风格 */
export function ServiceIcon({ slug }: { slug: string }) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: "h-6 w-6",
  };
  switch (slug) {
    case "gold-price": // 金条
      return (
        <svg {...common}>
          <rect x="7" y="3" width="10" height="18" rx="1.5" />
          <path d="M7 7h10M7 11h10M7 15h10M7 19h6" />
        </svg>
      );
    case "find": // 放大镜
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="6.5" />
          <path d="m20 20-3.2-3.2" />
          <path d="M11 8.5v5M8.5 11h5" />
        </svg>
      );
    case "proxy": // 一手中转（购物袋）
      return (
        <svg {...common}>
          <path d="M5 8h14l-1 12H6L5 8Z" />
          <path d="M9 8V6a3 3 0 0 1 6 0v2" />
        </svg>
      );
    case "make": // 打金（锤子）
      return (
        <svg {...common}>
          <path d="M15 3h2l1 1v2L8 16l-2 3-3 0 0-3L9 8 13 4l1-1h1Z" />
          <path d="m12 6 6 6M15 3 21 9" />
        </svg>
      );
    case "recycle": // 回收（环形箭头）
      return (
        <svg {...common}>
          <path d="M20 11a8 8 0 1 0-2.5 5.8" />
          <path d="M20 6v5h-5" />
        </svg>
      );
    case "qc": // 质检（盾牌+对勾）
      return (
        <svg {...common}>
          <path d="M12 3 5 5.5V11c0 4 3 7.5 7 9 4-1.5 7-5 7-9V5.5L12 3Z" />
          <path d="m9 11 2 2 4-4" />
        </svg>
      );
    case "design": // 设计（铅笔/笔+尺）
      return (
        <svg {...common}>
          <path d="M4 20 14 10l-2-2-10 10v2h2Z" />
          <path d="m12.5 11.5 2 2L19 9l-2-2-4.5 4.5Z" />
          <path d="M14.5 3.5 21 10" />
        </svg>
      );
    case "errand": // 跑腿（闪电计时）
      return (
        <svg {...common}>
          <path d="M13 2 5 13h5l-1 9 8-11h-5l1-9Z" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 8v8M8 12h8" />
        </svg>
      );
  }
}

/** 首页 8 宫格：金色线性图标 + 标题 + 副标，两行 4 列 */
export function ServiceGrid() {
  return (
    <div className="grid grid-cols-4 gap-x-3 gap-y-5">
      {SERVICES.map((s) => (
        <Link
          key={s.slug}
          href={`/services/${s.slug}`}
          className="group flex flex-col items-center gap-2 transition-transform duration-300 ease-out hover:-translate-y-1"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl gold-ring transition-shadow duration-300 group-hover:shadow-[0_12px_26px_-10px_rgba(176,141,74,0.55)]">
            <ServiceIcon slug={s.slug} />
          </span>
          <span className="text-sm font-medium">{s.title}</span>
          <span className="-mt-1 text-[11px] text-muted">{s.desc}</span>
        </Link>
      ))}
    </div>
  );
}