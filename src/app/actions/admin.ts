"use server";

import { createServerClient } from "@/lib/supabase";
import { getServerUser } from "@/lib/server-user";

// 生成的 Database 类型尚未包含 zhuli_role_applications 表，临时用宽松客户端访问
type LooseClient = { from: (table: string) => any };

/** 校验当前用户是管理员（zhuli_users.role = 'admin'），否则返回 null */
export async function adminUser() {
  const user = await getServerUser();
  if (!user) return null;
  const server = createServerClient();
  const { data } = await server.from("zhuli_users").select("role").eq("id", user.id).maybeSingle();
  return data?.role === "admin" ? user : null;
}

const GUARD = { error: "无管理员权限" };

/** 客户列表（含角色分类） */
export async function adminListCustomers() {
  const admin = await adminUser();
  if (!admin) return GUARD;
  const { data } = await createServerClient()
    .from("zhuli_users")
    .select("id, phone, nickname, company_name, role, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  return { data: data ?? [] };
}

/** 供应商入驻申请（status != active，即待审/已驳回） */
export async function adminListSupplierApplications() {
  const admin = await adminUser();
  if (!admin) return GUARD;
  const { data: rows } = await createServerClient()
    .from("zhuli_suppliers")
    .select("id, name, contact_name, contact_phone, category, stall_address, status, created_at, zhuli_users(nickname, phone)")
    .order("created_at", { ascending: false });
  return { data: (rows ?? []).filter((s) => s.status !== "active") };
}

/** 审核供应商入驻 */
export async function adminReviewSupplier(id: string, status: "active" | "rejected") {
  const admin = await adminUser();
  if (!admin) return GUARD;
  const { error } = await createServerClient()
    .from("zhuli_suppliers")
    .update({ status })
    .eq("id", id);
  return error ? { error: error.message } : { ok: true };
}

/** 待审核/全部商品（+ 档口名） */
export async function adminListProducts(status?: string) {
  const admin = await adminUser();
  if (!admin) return GUARD;
  let q = createServerClient()
    .from("zhuli_products")
    .select("*, zhuli_suppliers(name, contact_name)")
    .order("created_at", { ascending: false })
    .limit(300);
  if (status) q = q.eq("status", status);
  const { data } = await q;
  return { data: data ?? [] };
}

/** 商品审核：pending -> listed（上架，需设置平台售价）/ rejected / pending */
export async function adminReviewProduct(
  id: string,
  status: "listed" | "rejected" | "pending",
  platformPrice?: number
) {
  const admin = await adminUser();
  if (!admin) return GUARD;
  const { error } = await createServerClient()
    .from("zhuli_products")
    .update({
      status,
      ...(status === "listed" && typeof platformPrice === "number" && !Number.isNaN(platformPrice)
        ? { platform_price: platformPrice }
        : {}),
    })
    .eq("id", id);
  return error ? { error: error.message } : { ok: true };
}

/** 需求列表（找货/代购/质检/跑腿） */
export async function adminListTasks() {
  const admin = await adminUser();
  if (!admin) return GUARD;
  const { data } = await createServerClient()
    .from("zhuli_tasks")
    .select("*, zhuli_users(nickname, phone)")
    .order("created_at", { ascending: false })
    .limit(200);
  return { data: data ?? [] };
}

/** 角色申请列表（供应商 / 跑腿买手入驻待审） */
export async function adminListRoleApplications() {
  const admin = await adminUser();
  if (!admin) return GUARD;
  const { data } = await (createServerClient() as unknown as LooseClient)
    .from("zhuli_role_applications")
    .select("*, zhuli_users(nickname, phone)")
    .order("created_at", { ascending: false })
    .limit(200);
  return { data: data ?? [] };
}

/** 审批角色申请：approve / reject */
export async function adminReviewRoleApplication(
  id: string,
  status: "approved" | "rejected"
) {
  const admin = await adminUser();
  if (!admin) return GUARD;
  const server = createServerClient();
  const apps = server as unknown as LooseClient;

  // 读取该申请
  const { data: app } = await apps
    .from("zhuli_role_applications")
    .select("id, user_id, role, status")
    .eq("id", id)
    .maybeSingle();
  if (!app) return { error: "申请不存在" };
  if (app.status !== "pending") return { error: "该申请已处理" };

  if (status === "approved") {
    // 更新用户角色
    const { error: rErr } = await server
      .from("zhuli_users")
      .update({ role: app.role })
      .eq("id", app.user_id);
    if (rErr) return { error: rErr.message };

    // 审批为供应商时补建台账行，否则供应商工作台无法访问
    if (app.role === "supplier") {
      const { data: existing } = await server
        .from("zhuli_suppliers")
        .select("id")
        .eq("user_id", app.user_id)
        .maybeSingle();
      if (!existing) {
        const { error: sErr } = await server.from("zhuli_suppliers").insert({
          user_id: app.user_id,
          name: "新供应商档口",
          category: ["待补充"],
          status: "active",
        });
        if (sErr) return { error: sErr.message };
      }
    }
  }

  // 标记申请已处理
  const { error: uErr } = await apps
    .from("zhuli_role_applications")
    .update({ status, handled_by: admin.id, handled_at: new Date().toISOString() })
    .eq("id", id);
  return uErr ? { error: uErr.message } : { ok: true };
}

/** 推广管理列表：推广者 + 归属统计（引入用户/订单/需求数） */
export async function adminListReferrers() {
  const admin = await adminUser();
  if (!admin) return GUARD;
  const server = createServerClient() as unknown as LooseClient;

  const { data: refs } = await server
    .from("zhuli_referrers")
    .select("id, code, label, status, created_at, zhuli_users(nickname, phone)")
    .order("created_at", { ascending: false })
    .limit(200);
  const list = refs ?? [];
  if (!list.length) return { data: [] };

  const ids = list.map((r: any) => r.id);
  const [uR, oR, tR] = await Promise.all([
    server.from("zhuli_users").select("referrer_id").in("referrer_id", ids),
    server.from("zhuli_orders").select("referrer_id").in("referrer_id", ids),
    server.from("zhuli_tasks").select("referrer_id").in("referrer_id", ids),
  ]);
  const count = (rows: any[], key: string) => {
    const m: Record<string, number> = {};
    for (const r of rows) if (r[key]) m[r[key]] = (m[r[key]] ?? 0) + 1;
    return m;
  };
  const usersC = count(uR.data ?? [], "referrer_id");
  const orderC = count(oR.data ?? [], "referrer_id");
  const taskC = count(tR.data ?? [], "referrer_id");

  return {
    data: list.map((r: any) => ({
      ...r,
      ref_users: usersC[r.id] ?? 0,
      order_count: orderC[r.id] ?? 0,
      task_count: taskC[r.id] ?? 0,
    })),
  };
}

/** 审批推广者：approve / reject */
export async function adminReviewReferrer(id: string, status: "approved" | "rejected") {
  const admin = await adminUser();
  if (!admin) return GUARD;
  const { error } = await (createServerClient() as unknown as LooseClient)
    .from("zhuli_referrers")
    .update({ status, handled_by: admin.id, handled_at: new Date().toISOString() })
    .eq("id", id);
  return error ? { error: error.message } : { ok: true };
}