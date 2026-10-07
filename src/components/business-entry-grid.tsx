import Link from "next/link";

/**
 * 首页「业务直通车」：4 个具体业务场景入口（2×2 大卡）。
 * 与 8 宫格（服务能力目录）区分开：这里是「我要办什么事」的场景入口，
 * 分别落到现有的找货 / 跑腿 / 代购页面，用 scene 参数切换文案与档位。
 */
const ENTRIES = [
  {
    icon: "truck",
    title: "平台代发",
    desc: "平台店铺代购代发",
    href: "/services/proxy",
  },
  {
    icon: "store",
    title: "门店找货",
    desc: "门店缺货快速补货",
    href: "/services/find?scene=store",
  },
  {
    icon: "exchange",
    title: "同行调货",
    desc: "同行之间批量调货",
    href: "/services/find?scene=peer",
  },
  {
    icon: "package",
    title: "跑腿取货",
    desc: "同城取货送检代发",
    href: "/services/errand?scene=pickup",
  },
] as const;

function EntryIcon({ name }: { name: (typeof ENTRIES)[number]["icon"] }) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: "h-6 w-6",
  };
  switch (name) {
    case "exchange": // 同行调货：双向箭头
      return (
        <svg {...common}>
          <path d="M4 9h13" />
          <path d="m14 6 3 3-3 3" />
          <path d="M20 15H7" />
          <path d="m10 12-3 3 3 3" />
        </svg>
      );
    case "store": // 门店找货：店铺
      return (
        <svg {...common}>
          <path d="M4 9.5 5.5 4h13L20 9.5" />
          <path d="M5 9.5V20h14V9.5" />
          <path d="M9.5 20v-5.5h5V20" />
        </svg>
      );
    case "package": // 跑腿取货：包裹
      return (
        <svg {...common}>
          <path d="M12 3 4 7v10l8 4 8-4V7l-8-4Z" />
          <path d="m4 7 8 4 8-4" />
          <path d="M12 11v10" />
        </svg>
      );
    case "truck": // 平台发货：货车
      return (
        <svg {...common}>
          <path d="M3 16V7h11v9" />
          <path d="M14 10h4l3 3v3h-7" />
          <circle cx="7" cy="18" r="1.8" />
          <circle cx="17" cy="18" r="1.8" />
        </svg>
      );
  }
}

export function BusinessEntryGrid() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {ENTRIES.map((e) => (
        <Link
          key={e.title}
          href={e.href}
          className="glass group flex flex-col gap-3 rounded-2xl p-4 transition-transform duration-300 ease-out hover:-translate-y-0.5"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gold/10 text-gold transition-colors duration-300 group-hover:bg-gold/15">
            <EntryIcon name={e.icon} />
          </span>
          <span>
            <span className="block text-base font-medium">{e.title}</span>
            <span className="mt-0.5 block text-[11px] text-muted">{e.desc}</span>
          </span>
        </Link>
      ))}
    </div>
  );
}
