import { ServiceInfoPage } from "@/components/service-info";

export const dynamic = "force-dynamic";

export default function RecyclePage() {
  return (
    <ServiceInfoPage
      title="回收"
      desc="旧金闲置回收"
      color="#7a8b62"
      points={["足金/K金/铂金/钻石旧料皆可回收", "当面检测、按当日行情报价", "回收款项直接结算，透明放心"]}
    />
  );
}