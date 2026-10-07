import { ServiceInfoPage } from "@/components/service-info";

export const dynamic = "force-dynamic";

export default function GoldPricePage() {
  return (
    <ServiceInfoPage
      title="金价"
      desc="实时金价查询"
      color="#c9a227"
      points={["对接权威行情源，实时更新足金/K金/铂金等价格", "支持按克重估算工费与一口价", "辅助找货与回收比价"]}
    />
  );
}