// 身份徽章：每用户唯一字母。优先级：推广者 T 覆盖原字母。
export function roleBadge(role: string, isPromoter: boolean) {
  if (isPromoter) return { letter: "T", label: "推广员", color: "#c9a227" };
  switch (role) {
    case "admin":
      return { letter: "A", label: "管理员", color: "#111111" };
    case "supplier":
      return { letter: "S", label: "供应商", color: "#8a5a33" };
    case "buyer":
      return { letter: "Z", label: "买手/助理/跑腿", color: "#3a6ea5" };
    case "customer_b":
      return { letter: "B", label: "商业客户", color: "#7a3e8f" };
    case "customer_c":
    default:
      return { letter: "C", label: "顾客", color: "#6b8e4e" };
  }
}