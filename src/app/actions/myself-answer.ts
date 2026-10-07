"use server";

import { createServerClient } from "@/lib/supabase";
import { getServerUser } from "@/lib/server-user";

// 生成的 Database 类型尚未包含这些表，沿用宽松客户端访问
type LooseClient = { from: (table: string) => any };

export type SaveEntryInput = {
  branch: "need" | "offer";
  service_intents?: string[];
  other_intents?: string[];
  industry_role?: string;
  offer_capability_ids?: string[];
};

export type ResumeInput = {
  file_name: string;
  file_url: string;
  file_size?: number;
};

/** 读取当前用户偏好 */
export async function getMyEntry() {
  const user = await getServerUser();
  if (!user) return { entry: null };
  const s = createServerClient() as unknown as LooseClient;
  const { data } = await s.from("zhuli_user_entry").select("*").eq("user_id", user.id).maybeSingle();
  return { entry: data ?? null };
}

/** 保存用户偏好（首访分流 / 我的偏好） */
export async function saveMyAnswer(input: SaveEntryInput) {
  const user = await getServerUser();
  if (!user) return { ok: false as const, error: "请先登录" };
  if (input.branch !== "need" && input.branch !== "offer") {
    return { ok: false as const, error: "请先选择你是谁" };
  }
  const row: Record<string, any> = {
    user_id: user.id,
    branch: input.branch,
    service_intents: input.service_intents ?? [],
    other_intents: input.other_intents ?? [],
    industry_role: input.branch === "offer" ? input.industry_role ?? null : null,
    offer_capability_ids: input.branch === "offer" ? input.offer_capability_ids ?? [] : [],
    done: true,
  };
  const s = createServerClient() as unknown as LooseClient;
  const { error } = await s.from("zhuli_user_entry").upsert(row);
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

/** 上传人才库简历记录（文件本体已直传 COS zhuli/doc/） */
export async function saveResume(input: ResumeInput) {
  const user = await getServerUser();
  if (!user) return { ok: false as const, error: "请先登录" };
  const url = (input.file_url ?? "").trim();
  if (!/^https:\/\//.test(url)) return { ok: false as const, error: "简历文件地址无效" };
  const s = createServerClient() as unknown as LooseClient;
  const { data, error } = await s
    .from("zhuli_resumes")
    .insert({ user_id: user.id, file_name: input.file_name, file_url: url, file_size: input.file_size ?? null })
    .select("id")
    .single();
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, id: data?.id };
}

/** 当前用户简历列表 */
export async function listMyResumes() {
  const user = await getServerUser();
  if (!user) return { resumes: [] };
  const s = createServerClient() as unknown as LooseClient;
  const { data } = await s
    .from("zhuli_resumes")
    .select("id, file_name, file_url, file_size, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  return { resumes: data ?? [] };
}

/** 删除简历（只允许删自己的） */
export async function deleteResume(id: string) {
  const user = await getServerUser();
  if (!user) return { ok: false as const, error: "请先登录" };
  const s = createServerClient() as unknown as LooseClient;
  const { error } = await s.from("zhuli_resumes").delete().eq("id", id).eq("user_id", user.id);
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}