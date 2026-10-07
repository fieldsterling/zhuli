import Link from "next/link";
import { DesignWizard } from "@/components/design-wizard";
import { TrackPageView } from "@/components/track-page-view";

export const dynamic = "force-dynamic";

const FLOW = [
  { n: "01", t: "提交需求", d: "选品类/材料/克重/预算" },
  { n: "02", t: "设计方案", d: "手绘 + 3D 建模效果图" },
  { n: "03", t: "确认报价", d: "材料+工费透明，付定金开排" },
  { n: "04", t: "出模制作", d: "蜡模/3D打印→倒模→镶石抛光" },
  { n: "05", t: "交付质检", d: "复称 + 成色克重报告" },
];

const TRUST = [
  { t: "工费透明", d: "按当日金价+工费报价，无隐藏费用" },
  { t: "改稿无忧", d: "设计稿多轮沟通，定稿前免费修改" },
  { t: "质检严格", d: "国检级成色与克重报告，全程可查" },
  { t: "截单保障", d: "进入制作前可申请退定金" },
];

const FAQ = [
  { q: "定制一件要多长时间？", a: "看品类与工艺，简单款 5-7 天，带镶嵌/出模约 10-15 天，下单时会给具体排期。" },
  { q: "金料怎么算？", a: "按提交当天金价×克重计金料，工费单独透明展示，成品附成色克重报告。" },
  { q: "中途可以改吗？", a: "设计定稿前可多次修改；进入制作（出模）后如需变更会产生额外工费，会提前告知你。" },
  { q: "怎么联系设计师？", a: "提交需求单后，专属设计师会按单主动联系你，私聊核对细节并加微信沟通。" },
];

export default function DesignPage() {
  return (
    <div className="px-5 pt-8 pb-16">
      <TrackPageView event_type="page_view" source="design-service" />

      {/* Hero */}
      <header className="flex items-center gap-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-xl font-semibold text-white" style={{ background: "#a05ba6" }}>
          设
        </span>
        <div>
          <h1 className="text-xl font-semibold">原创珠宝设计</h1>
          <p className="mt-0.5 text-sm text-muted">不懂行也能定制的专属珠宝</p>
        </div>
      </header>

      {/* 流程时间轴 */}
      <section className="mt-6">
        <h2 className="text-base font-semibold">定制怎么走？5 步看懂</h2>
        <div className="mt-3 space-y-0">
          {FLOW.map((f, i) => (
            <div key={f.n} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {f.n}
                </span>
                {i < FLOW.length - 1 && <span className="mt-1 h-full w-px bg-black/10" />}
              </div>
              <div className="pb-5">
                <p className="text-sm font-medium">{f.t}</p>
                <p className="mt-0.5 text-xs text-muted">{f.d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 定制向导 */}
      <section className="mt-4">
        <h2 className="text-base font-semibold">开始你的定制</h2>
        <p className="mt-0.5 text-sm text-muted">两步三步，把想法说清楚</p>
        <div className="mt-3">
          <DesignWizard />
        </div>
      </section>

      {/* 信任保障 */}
      <section className="mt-6">
        <h2 className="text-base font-semibold">为什么放心定制</h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {TRUST.map((x) => (
            <div key={x.t} className="glass rounded-2xl p-4">
              <p className="text-sm font-semibold">{x.t}</p>
              <p className="mt-1 text-xs text-muted">{x.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="mt-6">
        <h2 className="text-base font-semibold">常见问题</h2>
        <div className="mt-3 space-y-2">
          {FAQ.map((x) => (
            <details key={x.q} className="glass rounded-2xl px-4 py-3">
              <summary className="cursor-pointer list-none text-sm font-medium">{x.q}</summary>
              <p className="mt-2 text-sm text-muted">{x.a}</p>
            </details>
          ))}
        </div>
      </section>

      <Link href="/services" className="mt-8 flex w-full items-center justify-center gap-1 rounded-2xl bg-primary py-3 font-medium text-primary-foreground">
        返回全部服务
      </Link>
    </div>
  );
}