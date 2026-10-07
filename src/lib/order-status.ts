import type { Database } from "@/types/supabase";

type OrderStatus = Database["public"]["Tables"]["zhuli_orders"]["Row"]["status"];

export const orderStatusMeta: Record<string, { label: string; color: string }> = {
  pending_payment: { label: "待支付", color: "text-amber-600 bg-amber-500/10" },
  paid: { label: "已支付", color: "text-blue-600 bg-blue-500/10" },
  assigned: { label: "已派单", color: "text-blue-600 bg-blue-500/10" },
  supplier_accepted: { label: "供应商已接单", color: "text-blue-600 bg-blue-500/10" },
  preparing: { label: "备货中", color: "text-blue-600 bg-blue-500/10" },
  qc_pending: { label: "待质检", color: "text-purple-600 bg-purple-500/10" },
  qc_passed: { label: "质检通过", color: "text-emerald-600 bg-emerald-500/10" },
  qc_failed: { label: "质检不通过", color: "text-danger bg-danger/10" },
  shipped: { label: "已发货", color: "text-blue-600 bg-blue-500/10" },
  delivered: { label: "已送达", color: "text-emerald-600 bg-emerald-500/10" },
  completed: { label: "已完成", color: "text-emerald-600 bg-emerald-500/10" },
  settled: { label: "已结算", color: "text-emerald-600 bg-emerald-500/10" },
  cancelled: { label: "已取消", color: "text-muted bg-black/5" },
  refunded: { label: "已退款", color: "text-muted bg-black/5" },
};

export function orderStatusLabel(status: OrderStatus): string {
  return orderStatusMeta[status]?.label ?? status;
}

export function orderStatusColor(status: OrderStatus): string {
  return orderStatusMeta[status]?.color ?? "text-muted bg-black/5";
}