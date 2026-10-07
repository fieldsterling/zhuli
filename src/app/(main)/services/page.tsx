import { getMyEntry } from "@/app/actions/myself-answer";
import { fetchSupplyCapabilities } from "@/lib/catalog-categories";
import { ServiceEntry } from "@/components/service-entry";
import { ServiceGrid } from "@/components/service-grid";

export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  const [{ entry }, supplies] = await Promise.all([getMyEntry(), fetchSupplyCapabilities()]);

  return (
    <div className="px-5 pt-8 pb-16">
      <h1 className="text-xl font-semibold">全部服务</h1>
      <p className="mt-1 text-sm text-muted">水贝源头的一站式珠宝服务</p>

      <div className="mt-4">
        <ServiceEntry initial={entry} supplies={supplies} mode="card" returnTo="/services" />
      </div>

      <div className="mt-6">
        <ServiceGrid />
      </div>
    </div>
  );
}