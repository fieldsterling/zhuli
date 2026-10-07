import Link from "next/link";

export const dynamic = "force-dynamic";

const steps = [
  { no: "01", title: "下单质检", desc: "在订单中选择质检服务，平台安排送检" },
  { no: "02", title: "权威检测", desc: "送国检（NGTC 等）机构出具检测报告" },
  { no: "03", title: "一键取回", desc: "证书可代发或同城跑腿取回，全程可查" },
] as const;

export default function QcPage() {
  return (
    <div className="px-5 pt-8 pb-6">
      <div className="flex items-center gap-3">
        <Link href="/services" className="glass flex h-9 w-9 items-center justify-center rounded-full" aria-label="返回">
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.7">
            <path d="m15 6-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-semibold">质检</h1>
          <p className="text-xs text-muted">国检权威检测，让每一件都放心</p>
        </div>
      </div>

      {/* 服务卡片 */}
      <div className="glass mt-6 rounded-2xl p-5">
        <div className="flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#6b8e4e]/10 text-lg font-semibold text-[#6b8e4e]">
            ✓
          </span>
          <div>
            <p className="text-base font-medium">足金 · K金 · 钻石 · 彩宝 · 珍珠</p>
            <p className="text-sm text-muted">国家珠宝玉石质量监督检验中心（NGTC）等权威机构</p>
          </div>
        </div>
      </div>

      {/* 流程 */}
      <section className="mt-8">
        <h2 className="text-base font-semibold">质检流程</h2>
        <div className="mt-4 space-y-3">
          {steps.map((s) => (
            <div key={s.no} className="glass flex items-center gap-4 rounded-2xl p-4">
              <span className="text-2xl font-bold text-gold/70">{s.no}</span>
              <div>
                <p className="text-sm font-medium">{s.title}</p>
                <p className="mt-0.5 text-xs text-muted">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 入口 */}
      <div className="mt-8 space-y-3">
        <Link
          href="/orders"
          className="flex w-full items-center justify-between rounded-2xl bg-primary px-5 py-4 text-sm font-medium text-primary-foreground"
        >
          查看我的订单与质检记录
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.7">
            <path d="m9 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <Link
          href="/services/errand"
          className="glass flex w-full items-center justify-between rounded-2xl px-5 py-4 text-sm font-medium text-ink"
        >
          需要跑腿送检/取证？用跑腿服务
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-muted" stroke="currentColor" strokeWidth="1.7">
            <path d="m9 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      </div>
    </div>
  );
}