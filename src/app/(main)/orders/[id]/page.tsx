"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Copy } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase";
import { useAuthStore } from "@/store/auth";
import { orderStatusLabel, orderStatusColor } from "@/lib/order-status";
import { submitTransferProof } from "@/app/actions/order";
import type { Database } from "@/types/supabase";

type Order = Database["public"]["Tables"]["zhuli_orders"]["Row"];
type OrderItem = Database["public"]["Tables"]["zhuli_order_items"]["Row"];
type Address = { receiver: string; phone: string; full: string };

/** 订单状态机主流程（线性展示用）。分支状态不回退到主流程。 */
const FLOW: { key: string; label: string }[] = [
  { key: "pending_payment", label: "待支付" },
  { key: "paid", label: "已支付" },
  { key: "preparing", label: "备货/质检" },
  { key: "shipped", label: "已发货" },
  { key: "delivered", label: "已送达" },
  { key: "completed", label: "已完成" },
];

const FLOW_INDEX: Record<string, number> = {
  pending_payment: 0,
  paid: 1,
  assigned: 1,
  supplier_accepted: 1,
  preparing: 2,
  qc_pending: 2,
  qc_passed: 2,
  qc_failed: 1,
  shipped: 3,
  delivered: 4,
  completed: 5,
  settled: 5,
};

function OrderTimeline({ status }: { status: string }) {
  const idx = FLOW_INDEX[status];
  if (idx === undefined) return null; // cancelled / refunded 不展示时间线
  return (
    <div className="flex items-center px-2 py-1">
      {FLOW.map((step, i) => {
        const done = i < idx;
        const current = i === idx;
        return (
          <div key={step.key} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] ${
                  done
                    ? "bg-primary text-primary-foreground"
                    : current
                      ? "bg-gold text-white ring-2 ring-gold/30"
                      : "bg-black/8 text-muted"
                }`}
              >
                {i + 1}
              </span>
              <span
                className={`whitespace-nowrap text-[10px] ${
                  current ? "font-medium text-foreground" : "text-muted"
                }`}
              >
                {step.label}
              </span>
            </div>
            {i < FLOW.length - 1 && (
              <div
                className={`mx-1 mb-4 h-0.5 flex-1 rounded ${
                  i < idx ? "bg-primary" : "bg-black/10"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createBrowserClient();
  const user = useAuthStore((s) => s.user);

  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState("");

  useEffect(() => {
    if (!id || !user) {
      setLoading(false);
      return;
    }
    let active = true;
    Promise.all([
      supabase
        .from("zhuli_orders")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("zhuli_order_items")
        .select("*")
        .eq("order_id", id),
    ]).then(([{ data: orderData, error: orderErr }, { data: itemData }]) => {
      if (!active) return;
      if (orderErr) setError(orderErr.message);
      else setOrder((orderData ?? null) as Order | null);
      setItems((itemData ?? []) as OrderItem[]);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [supabase, id, user]);

  function copyText(text: string, key: string) {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(""), 1500);
    });
  }

  async function onTransfer() {
    if (!order) return;
    setSubmitting(true);
    const res = await submitTransferProof(order.id);
    setSubmitting(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    // 刷新
    const { data } = await supabase
      .from("zhuli_orders")
      .select("*")
      .eq("id", order.id)
      .maybeSingle();
    if (data) setOrder(data as Order);
  }

  if (loading || !user) {
    return (
      <div className="px-5 pt-8">
        <div className="h-6 w-24 animate-pulse rounded bg-black/8" />
        <div className="mt-4 h-40 animate-pulse rounded-2xl bg-black/5" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex flex-col items-center px-5 pt-24">
        <p className="text-sm text-muted">订单不存在或无权限查看</p>
        <Link
          href="/orders"
          className="mt-4 rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground"
        >
          返回订单列表
        </Link>
      </div>
    );
  }

  const addr = (order.address ?? {}) as Address;
  const isPending = order.status === "pending_payment";
  const transferSubmitted = order.payment_intent === "manual_transfer_submitted";

  return (
    <div className="px-5 pt-8 pb-32">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1 text-sm text-muted"
      >
        <ChevronLeft className="h-4 w-4" /> 返回
      </button>

      {/* 状态区 */}
      <section className="mt-3 rounded-2xl bg-primary p-5 text-primary-foreground">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-base font-semibold">{orderStatusLabel(order.status)}</p>
            <p className="mt-1 text-xs opacity-80">
              订单号 {order.order_no}
            </p>
          </div>
          <span className="text-2xl font-semibold">
            ¥{Number(order.total_amount ?? 0).toLocaleString()}
          </span>
        </div>
        <div className="mt-4 border-t border-white/15 pt-4">
          <OrderTimeline status={order.status} />
        </div>
      </section>

      {/* 待支付：转账说明 + 已转账标记 */}
      {isPending && (
        <section className="mt-4">
          <div className="glass rounded-2xl p-4">
            <h3 className="text-sm font-semibold">{transferSubmitted ? "已提交转账" : "转账支付"}</h3>
            {!transferSubmitted ? (
              <>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  当前为人工转账模式，请向客服提供的收款账户转账，金额为{" "}
                  <b className="text-primary">
                    ¥{Number(order.total_amount ?? 0).toLocaleString()}
                  </b>
                  ，转账后点击下方按钮，客服核实后即可发货。
                </p>
                <div className="mt-3 space-y-2 rounded-xl bg-black/[0.03] p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted">收款方式</span>
                    <span>银行转账 / 微信 / 支付宝</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted">订单号</span>
                    <span className="flex items-center gap-1">
                      {order.order_no}
                      <button onClick={() => copyText(order.order_no, "no")}>
                        <Copy className="h-3.5 w-3.5 text-muted" />
                      </button>
                      {copied === "no" && <span className="text-primary">已复制</span>}
                    </span>
                  </div>
                </div>
                <button
                  onClick={onTransfer}
                  disabled={submitting}
                  className="mt-4 w-full rounded-xl bg-primary py-3 font-medium text-primary-foreground disabled:opacity-50"
                >
                  {submitting ? "提交中…" : "我已转账"}
                </button>
                <p className="mt-2 text-center text-[11px] text-muted">
                  请保留转账凭证，方便客服快速核实
                </p>
              </>
            ) : (
              <p className="mt-2 text-sm text-muted">
                已收到您的转账标记，客服核实后会尽快安排发货。
              </p>
            )}
          </div>
        </section>
      )}

      {/* 收货信息 */}
      {addr.full && (
        <section className="mt-4">
          <h3 className="text-sm font-medium text-muted">收货信息</h3>
          <div className="glass mt-2 rounded-2xl p-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-medium">{addr.receiver}</span>
              <span className="text-muted">{addr.phone}</span>
            </div>
            <p className="mt-2 leading-relaxed text-muted">{addr.full}</p>
          </div>
        </section>
      )}

      {/* 商品清单 */}
      <section className="mt-5">
        <h3 className="text-sm font-medium text-muted">商品清单</h3>
        <div className="mt-2 space-y-2">
          {items.map((it) => {
            const snap = (it.snapshot ?? {}) as { title?: string; image?: string | null };
            return (
              <div key={it.id} className="glass flex gap-3 rounded-2xl p-3">
                {snap.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={snap.image}
                    alt={snap.title ?? "商品"}
                    className="h-16 w-16 shrink-0 rounded-lg object-cover"
                  />
                ) : (
                  <div className="h-16 w-16 shrink-0 rounded-lg bg-black/5" />
                )}
                <div className="flex min-w-0 flex-1 flex-col justify-between">
                  <p className="line-clamp-2 text-sm font-medium">{snap.title ?? "商品"}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-gold text-sm font-semibold">
                      ¥{Number(it.unit_price).toLocaleString()}
                    </span>
                    <span className="text-xs text-muted">×{it.quantity}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 金额明细 */}
      <section className="mt-5">
        <div className="glass rounded-2xl p-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted">商品金额</span>
            <span>¥{Number(order.total_amount ?? 0).toLocaleString()}</span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-muted">运费</span>
            <span>免运费</span>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-black/5 pt-3">
            <span className="font-medium">实付金额</span>
            <span className="text-lg font-semibold text-primary">
              ¥{Number(order.total_amount ?? 0).toLocaleString()}
            </span>
          </div>
        </div>
      </section>

      {/* 订单信息 */}
      <section className="mt-5">
        <div className="glass rounded-2xl p-4 text-xs text-muted">
          <div className="flex items-center justify-between">
            <span>订单编号</span>
            <span className="flex items-center gap-1 text-foreground">
              {order.order_no}
              <button onClick={() => copyText(order.order_no, "no2")}>
                <Copy className="h-3.5 w-3.5" />
              </button>
              {copied === "no2" && <span className="text-primary">已复制</span>}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span>下单时间</span>
            <span>{new Date(order.created_at).toLocaleString("zh-CN")}</span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span>订单金额</span>
            <span>¥{Number(order.total_amount ?? 0).toLocaleString()}</span>
          </div>
          {order.notes && (
            <div className="mt-2">
              <span>备注</span>
              <p className="mt-1 whitespace-pre-line text-foreground">{order.notes}</p>
            </div>
          )}
        </div>
      </section>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}
    </div>
  );
}