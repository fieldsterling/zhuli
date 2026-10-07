import { ServiceInfoPage } from "@/components/service-info";

export const dynamic = "force-dynamic";

export default function MakePage() {
  return (
    <ServiceInfoPage
      title="打金"
      desc="来料打金定制"
      color="#d0763f"
      points={["支持来料加工，旧金焕新不贬值", "款式可定制，水贝工坊直做", "成色检测与克重报告全程可查"]}
    />
  );
}