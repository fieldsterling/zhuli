"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase";
import { useAuthStore } from "@/store/auth";
import { roleBadge } from "@/lib/badge";

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createBrowserClient();
  const user = useAuthStore((s) => s.user);
  const [nickname, setNickname] = useState("");
  const [role, setRole] = useState("");
  const [isPromoter, setIsPromoter] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("zhuli_users")
      .select("nickname, role")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setNickname(data?.nickname ?? "");
        setRole((data?.role as string | undefined) ?? "");
      });
    // 类型生成尚缺 zhuli_referrers 表，用宽松客户端访问
    (supabase as unknown as { from: (t: string) => any })
      .from("zhuli_referrers")
      .select("status")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }: { data: any }) => setIsPromoter(data?.status === "approved"));
  }, [supabase, user]);

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center px-5 pt-24">
        <p className="text-sm text-muted">请先登录</p>
        <button
          onClick={() => router.push("/login")}
          className="mt-4 rounded-xl bg-primary px-6 py-2.5 font-medium text-primary-foreground"
        >
          去登录
        </button>
      </div>
    );
  }

  const email = user.email ?? (user.phone ? null : null);
  const phone = user.phone ?? (email ? null : user.email ?? null);

  return (
    <div className="px-5 pt-8 pb-16">
      {/* 账号信息 */}
      <section className="flex items-center gap-4">
        {user.user_metadata?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.user_metadata.avatar_url} alt="头像" className="h-16 w-16 rounded-full object-cover" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-2xl font-semibold text-primary">
            {(nickname || "珠").slice(0, 1)}
          </div>
        )}
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-xl font-semibold">
            {nickname || "珠宝用户"}
            {roleBadge(role, isPromoter) && (
              <span
                className="px-2 py-0.5 text-[11px] font-semibold text-white"
                style={{ background: roleBadge(role, isPromoter)!.color, borderRadius: 999 }}
                title={roleBadge(role, isPromoter)!.label}
              >
                {roleBadge(role, isPromoter)!.letter}
              </span>
            )}
          </h1>
          <p className="mt-1 truncate text-sm text-muted">
            {phone && <>手机号  {phone.slice(0, 3)}****{phone.slice(-4)}</>}
            {(phone && email && " · ") } 
            {email && <>{email}</>}
          </p>
        </div>
      </section>

      {/* 常用入口：圆角方格导航，仿首页服务入口 */}
      <section className="mt-6 grid grid-cols-2 gap-3">
        <Entry
          label="我的订单"
          desc="查看全部订单与物流"
          onClick={() => router.push("/orders")}
        />
        <Entry
          label="我的服务"
          desc="找货 / 代购 / 质检 / 跑腿记录"
          onClick={() => router.push("/services-records")}
        />
        <Entry
          label="账号设置"
          desc="用户名 / 头像 / 手机号 / 密码"
          onClick={() => router.push("/settings")}
        />
        <Entry
          label="收货地址"
          desc="维护常用收货地址"
          onClick={() => router.push("/address")}
        />
        <Entry
          label={isPromoter ? "推广中心" : "成为推广者"}
          desc={isPromoter ? "查看分享链接与归属数据" : "分享专属链接，业务提交归你"}
          onClick={() => router.push("/promoter")}
        />
        {!["admin", "supplier", "buyer"].includes(role) && (
          <Entry
            label="申请入驻"
            desc="申请成为供应商 / 跑腿买手"
            onClick={() => router.push("/apply-role")}
          />
        )}
        {role === "supplier" && (
          <Entry
            label="供应商工作台"
            desc="供货 / 上传商品"
            onClick={() => router.push("/supplier")}
          />
        )}
        {role === "buyer" && (
          <Entry
            label="买手工作台"
            desc="接取找货 / 跑腿需求"
            onClick={() => router.push("/buyer")}
          />
        )}
        {role === "admin" && (
          <Entry
            label="平台管理"
            desc="核销转账等"
            onClick={() => router.push("/admin")}
          />
        )}
        <Entry label="退出登录" danger onClick={logout} />
      </section>
    </div>
  );
}

function Entry({
  label,
  desc,
  onClick,
  danger,
}: {
  label: string;
  desc?: string;
  onClick?: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "flex min-h-[76px] flex-col items-center justify-center gap-1.5 rounded-2xl px-3 py-3 text-center transition-all duration-300 hover:-translate-y-1 " +
        (danger
          ? "border border-danger/30"
          : "gold-ring hover:shadow-[0_12px_26px_-10px_rgba(176,141,74,0.55)]")
      }
    >
      <span className={`text-sm font-medium ${danger ? "text-danger" : ""}`}>{label}</span>
      {desc && (
        <span className="text-[11px] leading-tight text-muted">{desc}</span>
      )}
    </button>
  );
}