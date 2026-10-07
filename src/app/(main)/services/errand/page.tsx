import { TaskServicePage } from "@/components/task-service-page";

/** 场景化入口文案：?scene=pickup 跑腿取货，缺省为通用跑腿 */
const SCENES: Record<string, { title: string; subtitle: string; placeholder: string }> = {
  pickup: {
    title: "跑腿取货",
    subtitle: "同城取货送检，专人帮你去档口拿货",
    placeholder: "取货跑腿：例如 去水贝金展某档口取 3 件手镯，送质检站并代发快递…",
  },
};

const DEFAULT_SCENE = {
  title: "跑腿",
  subtitle: "同城极速跑腿，送检取货代发全搞定",
  placeholder: "需要跑腿做什么？例如：帮我去质检站取回证书并代发快递…",
};

export default async function ErrandPage({
  searchParams,
}: {
  searchParams: Promise<{ scene?: string | string[] }>;
}) {
  const { scene } = await searchParams;
  const key = Array.isArray(scene) ? scene[0] : scene;
  const s = (key && SCENES[key]) || DEFAULT_SCENE;

  return (
    <TaskServicePage
      type="errand"
      title={s.title}
      subtitle={s.subtitle}
      placeholder={s.placeholder}
      accent="#3a6ea5"
    />
  );
}