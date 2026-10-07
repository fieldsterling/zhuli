import { TaskServicePage } from "@/components/task-service-page";

/** 场景化入口文案：?scene=peer 同行调货 / ?scene=store 门店找货，缺省为通用找货 */
const SCENES: Record<string, { title: string; subtitle: string; placeholder: string; tier: "c" | "b" }> = {
  peer: {
    title: "同行调货",
    subtitle: "同行之间批量调货，按批量采购发布需求",
    placeholder: "同行调货：例如 古法金手镯 足金999 15-20g 圈口56 20件 7日内…",
    tier: "b",
  },
  store: {
    title: "门店找货",
    subtitle: "门店缺货快速补货，按单件定制发布需求",
    placeholder: "门店找货：例如 素圈戒指 足金999 3-5g 12号 2件 3日内…",
    tier: "c",
  },
};

const DEFAULT_SCENE = {
  title: "找货",
  subtitle: "水贝源头找货，报需求即有人接单",
  placeholder: "想找什么样的珠宝？例如：18K金细项链约2克，工费尽量低，预算1000内…",
  tier: "c" as const,
};

export default async function FindPage({
  searchParams,
}: {
  searchParams: Promise<{ scene?: string | string[] }>;
}) {
  const { scene } = await searchParams;
  const key = Array.isArray(scene) ? scene[0] : scene;
  const s = (key && SCENES[key]) || DEFAULT_SCENE;

  return (
    <TaskServicePage
      type="find"
      title={s.title}
      subtitle={s.subtitle}
      placeholder={s.placeholder}
      showBudget
      defaultTier={s.tier}
      accent="#b08d4a"
    />
  );
}