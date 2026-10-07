import { getMyEntry } from "@/app/actions/myself-answer";
import { fetchSupplyCapabilities } from "@/lib/catalog-categories";
import { ServiceEntry } from "@/components/service-entry";
import { ResumeBox } from "@/components/resume-box";

export const dynamic = "force-dynamic";

/** 我的偏好：重新配置首访分流的选择（需要登录） */
export default async function PreferencesPage() {
  const [{ entry }, supplies] = await Promise.all([getMyEntry(), fetchSupplyCapabilities()]);

  return (
    <div className="px-5 pt-8 pb-16">
      <h1 className="text-xl font-semibold">我的偏好</h1>
      <p className="mt-1 text-sm text-muted">告诉平台你是谁，我们据此推荐相关的产品和服务</p>

      <div className="mt-5">
        <ServiceEntry initial={entry} supplies={supplies} mode="page" returnTo="/settings/preferences" />
      </div>

      {/* 人才库简历 */}
      <ResumeBox />
    </div>
  );
}