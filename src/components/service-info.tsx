import Link from "next/link";

/** 新服务的信息落地页（金价/打金/回收/设计），入口导航不可落空 */
export function ServiceInfoPage({
  title,
  desc,
  color,
  points,
}: {
  title: string;
  desc: string;
  color: string;
  points: string[];
}) {
  return (
    <div className="px-5 pt-8 pb-16">
      <header className="flex items-center gap-4">
        <span
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-xl font-semibold text-white"
          style={{ background: color }}
        >
          {title.slice(0, 1)}
        </span>
        <div>
          <h1 className="text-xl font-semibold">{title}</h1>
          <p className="mt-0.5 text-sm text-muted">{desc}</p>
        </div>
      </header>

      <section className="glass mt-6 rounded-2xl p-5">
        <h2 className="text-base font-semibold">服务说明</h2>
        <ul className="mt-3 space-y-2">
          {points.map((p, i) => (
            <li key={i} className="flex gap-2 text-sm text-muted">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-black/30" />
              {p}
            </li>
          ))}
        </ul>
        <p className="mt-4 rounded-xl bg-black/5 px-4 py-3 text-sm text-muted">
          该项服务正在完善中，即将上线，敬请期待。
        </p>
      </section>

      <Link
        href="/services"
        className="mt-6 flex w-full items-center justify-center gap-1 rounded-2xl bg-primary py-3 font-medium text-primary-foreground"
      >
        返回全部服务
      </Link>
    </div>
  );
}