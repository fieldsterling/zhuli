"use server";

import { createServerClient } from "@/lib/supabase";
import { getServerUser } from "@/lib/server-user";

// 生成的 Database 类型尚未包含 zhuli_role_applications 表，临时用宽松客户端访问
type LooseClient = { from: (table: string) => any };

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 去掉易混淆的 0/O/1/I
function genCode(len = 5): string {
  let s = "";
  for (let i = 0; i < len; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return s;
}

/**
 * 手机号注册：把手机号转成「伪邮箱」<phone>@phone.zhuli.app，用 service role
 * 直接建号并置 email_confirm=true 跳过邮箱验证（符合「手机号注册不验邮箱」要求）。
 * 注册成功后用户仍可用原手机号 + 短信验证码登录。
 */
export async function registerPhone(input: { phone: string; password: string }) {
  const phone = String(input.phone ?? "").trim();
  const password = String(input.password ?? "");
  if (!/^1\d{10}$/.test(phone)) return { error: "请输入 11 位手机号" };
  if (password.length < 6) return { error: "密码至少 6 位" };

  const pseudoEmail = `${phone}@phone.zhuli.app`;
  const server = createServerClient();

  const { data, error } = await server.auth.admin.createUser({
    email: pseudoEmail,
    phone,
    password,
    email_confirm: true,
    phone_confirm: true,
    user_metadata: { phone, nickname: `用户${phone.slice(-4)}` },
  });
  // 邮箱唯一冲突（已注册）= Supabase 层报 duplicate，直接提示已注册
  if (error) {
    if (/duplicate|already|exists|conflict/i.test(error.message))
      return { error: "该手机号已注册，请直接登录" };
    return { error: error.message ?? "注册失败" };
  }
  if (!data.user) return { error: "注册失败" };

  // 建 zhuli_users 档案
  const { error: insErr } = await server.from("zhuli_users").insert({
    id: data.user.id,
    phone,
    nickname: `用户${phone.slice(-4)}`,
  });
  if (insErr) return { error: insErr.message };

  return { ok: true, email: pseudoEmail };
}

/**
 * 邮箱注册建档案：客户端 signUp 拿到 user 后，用 service role 补 zhuli_users 行。
 * role 默认 customer_c。
 */
export async function ensureProfileForAuthUser(input: {
  userId: string;
  email: string;
  phone?: string | null;
}) {
  if (!input.userId) return { error: "缺少用户" };
  const server = createServerClient();
  const { data: existing, error: selErr } = await server
    .from("zhuli_users")
    .select("id")
    .eq("id", input.userId)
    .maybeSingle();
  if (selErr) return { error: selErr.message };
  if (existing) return { ok: true };

  const nickname = input.email.split("@")[0] || "珠宝用户";
  const { error: insErr } = await server.from("zhuli_users").insert({
    id: input.userId,
    phone: input.phone ?? null,
    nickname,
  });
  if (insErr) return { error: insErr.message };
  return { ok: true };
}

/**
 * 确保登录用户在 zhuli_users 中存在（首次登录自动建档案）。
 * 用 service role 写入，绕过 RLS。仅在已登录时调用。
 */
export async function ensureZhuliUser() {
  const user = await getServerUser();

  if (!user) return { ok: false, error: "unauthorized" };

  const phone = user.phone ?? null;
  const metadata = user.user_metadata as Record<string, unknown> | undefined;
  const nickname =
    (metadata?.nickname as string) ||
    (metadata?.name as string) ||
    (phone ? `用户${phone.slice(-4)}` : "珠宝用户");

  const server = createServerClient();
  const {
    data: existing,
    error: selErr,
  } = await server.from("zhuli_users").select("id, phone").eq("id", user.id).maybeSingle();

  if (selErr) return { ok: false, error: selErr.message };

  if (!existing) {
    const { error: insErr } = await server.from("zhuli_users").insert({
      id: user.id,
      phone,
      nickname,
    });
    if (insErr) return { ok: false, error: insErr.message };
  } else {
    // 已有档案，仅补齐 phone（如之前为空）
    if (!existing.phone && phone) {
      await server.from("zhuli_users").update({ phone }).eq("id", user.id);
    }
  }

  return { ok: true };
}

/**
 * 申请成为供应商 / 跑腿买手。
 * 生成一条 pending 的角色申请，管理员在后台审批。
 */
export async function applyForRole(role: "supplier" | "buyer", note?: string) {
  const user = await getServerUser();
  if (!user) return { error: "请先登录" };
  if (!["supplier", "buyer"].includes(role)) return { error: "仅支持申请供应商或跑腿买手" };

  const server = createServerClient();
  const { error } = await (server as unknown as LooseClient)
    .from("zhuli_role_applications")
    .insert({
      user_id: user.id,
      role,
      status: "pending",
      note: note?.trim() || null,
    });
  if (error) {
    if (/duplicate|unique/i.test(error.message))
      return { error: "你已有一份待审核的申请，请耐心等待" };
    return { error: error.message ?? "提交失败" };
  }
  return { ok: true };
}

/** 申请成为推广者：生成一条 pending 推广台账 + 默认 5 位分享码 */
export async function applyForReferrer() {
  const user = await getServerUser();
  if (!user) return { error: "请先登录" };
  const server = createServerClient() as unknown as LooseClient;

  // 已有推广记录则不同重复申请
  const { data: exist } = await server.from("zhuli_referrers").select("id, status").eq("user_id", user.id).maybeSingle();
  if (exist) {
    return { error: exist.status === "pending" ? "推广申请审核中，请耐心等待" : "你已是推广者或已申请过" };
  }

  // 生成唯一分享码（5 位字母数字，避免冲撞重试）
  let code = genCode();
  for (let i = 0; i < 5; i++) {
    const { data: hit } = await server.from("zhuli_referrers").select("code").eq("code", code).maybeSingle();
    if (!hit) break;
    code = genCode();
  }

  const { error } = await server.from("zhuli_referrers").insert({
    user_id: user.id,
    code,
    status: "pending",
  });
  if (error) return { error: error.message ?? "申请失败" };
  return { ok: true };
}

/** 绑定来源：某用户通过 分享码 进来，将其归属到该推广者（仅第一次绑定） */
export async function bindReferrer(code: string) {
  const user = await getServerUser();
  if (!user) return { error: "请先登录" };
  const c = (code ?? "").trim().toUpperCase();
  if (!c) return { error: "分享码为空" };

  const server = createServerClient() as unknown as LooseClient;

  // 只有「已通过」的推广者分享码才生效
  const { data: ref } = await server
    .from("zhuli_referrers")
    .select("id")
    .eq("code", c)
    .eq("status", "approved")
    .maybeSingle();
  if (!ref) return { error: "分享码无效" };
  if (ref.id) {
    const { data: me } = await server.from("zhuli_users").select("referrer_id").eq("id", user.id).maybeSingle();
    if (!me?.referrer_id) {
      await server.from("zhuli_users").update({ referrer_id: ref.id }).eq("id", user.id);
    }
  }
  return { ok: true };
}

/** 推广者自改分享码/名称（仅本人、仅已通过时生效） */
export async function updateMyReferrer(patch: { code?: string; label?: string }) {
  const user = await getServerUser();
  if (!user) return { error: "请先登录" };
  const server = createServerClient() as unknown as LooseClient;

  const { data: mine } = await server.from("zhuli_referrers").select("id, status").eq("user_id", user.id).maybeSingle();
  if (!mine) return { error: "请先申请成为推广者" };
  if (mine.status !== "approved") return { error: "推广申请通过后才能修改" };

  const upd: Record<string, string | null> = {};
  if (patch.label !== undefined) upd.label = patch.label.trim() || null;
  if (patch.code !== undefined) {
    const c = patch.code.trim().toUpperCase();
    if (!/^[A-Z0-9]{3,16}$/.test(c)) return { error: "分享码须为 3-16 位字母或数字" };
    const { data: hit } = await server.from("zhuli_referrers").select("id").eq("code", c).maybeSingle();
    if (hit && hit.id !== mine.id) return { error: "该分享码已被占用" };
    upd.code = c;
  }
  if (!Object.keys(upd).length) return { ok: true };

  const { error } = await server.from("zhuli_referrers").update(upd).eq("id", mine.id);
  return error ? { error: error.message } : { ok: true };
}

/** 推广者本人统计：归属的用户数 / 订单数 / 需求数 */
export async function getMyPromoterStats() {
  const user = await getServerUser();
  if (!user) return { error: "请先登录" };
  const server = createServerClient() as unknown as LooseClient;
  const { data: mine } = await server.from("zhuli_referrers").select("id").eq("user_id", user.id).maybeSingle();
  if (!mine) return { data: { ref_users: 0, order_count: 0, task_count: 0 } };
  const [uR, oR, tR] = await Promise.all([
    server.from("zhuli_users").select("referrer_id").eq("referrer_id", mine.id),
    server.from("zhuli_orders").select("referrer_id").eq("referrer_id", mine.id),
    server.from("zhuli_tasks").select("referrer_id").eq("referrer_id", mine.id),
  ]);
  return {
    data: {
      ref_users: (uR.data ?? []).length,
      order_count: (oR.data ?? []).length,
      task_count: (tR.data ?? []).length,
    },
  };
}