"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { submitDesignRequest } from "@/app/actions/design";
import { track } from "@/lib/track";
import { uploadToCos } from "@/lib/upload";

const MAX_REFS = 6;

const CATEGORIES = ["戒指", "项链", "吊坠", "耳饰", "手镯", "情侣对"];
const MATERIALS = ["足金", "18K金", "铂金", "钻石", "翡翠", "彩宝", "玉石", "其他"];
const STYLES = ["极简", "复古", "奢华", "甜美", "自然", "国风", "通勤", "收藏"];

const STEPS = ["品类", "材料·克重", "风格·预算", "补充·提交"];

type Draft = {
  category: string;
  material: string;
  weight: string;
  budget: string;
  style: string[];
  purpose: string;
  engraving: string;
  notes: string;
};

const empty: Draft = {
  category: "",
  material: "",
  weight: "",
  budget: "",
  style: [],
  purpose: "",
  engraving: "",
  notes: "",
};

const LABELS: Record<string, string> = {
  category: "品类",
  material: "材料",
  weight: "克重",
  budget: "预算",
  style: "风格",
  purpose: "用途",
  engraving: "刻字",
  notes: "补充说明",
};

function Chip({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        on
          ? "rounded-full bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
          : "rounded-full bg-black/5 px-3 py-1.5 text-sm font-medium"
      }
    >
      {children}
    </button>
  );
}

/** 分步引导即可提交的定制需求单 */
export function DesignWizard() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(empty);
  const [msg, setMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [refs, setRefs] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  function toggle(list: string[], v: string): string[] {
    return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
  }

  // 各步“下一步”校验
  const canNext =
    step === 0
      ? !!draft.category
      : step === 1
      ? !!draft.material
      : step === 2
      ? true
      : true;

  async function submit() {
    setMsg("");
    if (!user) {
      router.push("/login");
      return;
    }
    if (uploading) {
      setMsg("参考图上传中，请稍候…");
      return;
    }
    setSubmitting(true);
    const res = await submitDesignRequest({
      category: draft.category,
      material: draft.material || undefined,
      weight: draft.weight || undefined,
      budget: draft.budget || undefined,
      style: draft.style.join(",") || undefined,
      purpose: draft.purpose || undefined,
      engraving: draft.engraving || undefined,
      notes: draft.notes || undefined,
      ref_images: refs.slice(0, MAX_REFS),
    });
    setSubmitting(false);
    if (res.error) {
      setMsg(res.error);
      return;
    }
    setDone(draft.category);
    // 行为埋点：提交设计定制需求
    track({ event_type: "design_submit", target_type: "service", context_entity: "design", meta: { category: draft.category, refs: refs.length } });
    setDraft(empty);
    setRefs([]);
    setStep(0);
  }

  async function handleRefs(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    const room = MAX_REFS - refs.length;
    const take = files.slice(0, room);
    if (take.length === 0) return;
    setUploading(true);
    setMsg("");
    try {
      for (const f of take) {
        const url = await uploadToCos(f, "design");
        setRefs((prev) => (prev.length < MAX_REFS ? [...prev, url] : prev));
      }
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "参考图上传失败");
    } finally {
      setUploading(false);
    }
  }

  if (!user) {
    return (
      <div className="glass rounded-2xl p-6 text-center">
        <p className="text-sm text-foreground">登录后即可提交定制需求</p>
        <p className="mt-1 text-sm text-muted">提交后将生成专属需求单，设计师按单回复</p>
        <button
          onClick={() => router.push("/login")}
          className="mt-4 w-full rounded-xl bg-primary py-3 font-medium text-primary-foreground"
        >
          登录 / 注册
        </button>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-5">
      {/* 步骤指示 */}
      <div className="flex items-center gap-1">
        {STEPS.map((s, i) => (
          <div key={s} className="flex flex-1 flex-col items-center gap-1">
            <div
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                i === step
                  ? "bg-primary text-primary-foreground"
                  : i < step
                  ? "bg-primary/20 text-primary"
                  : "bg-black/5 text-muted"
              }`}
            >
              {i + 1}
            </div>
            <span className="text-[11px] text-muted">{s}</span>
          </div>
        ))}
      </div>

      {done ? (
        <div className="mt-5 text-center">
          <p className="text-base font-semibold">需求单已提交</p>
          <p className="mt-1 text-sm text-muted">
            已收到你的{LABELS.category}「{done}」定制意向，设计师将按单联系你确认细节
          </p>
          <button
            onClick={() => setDone(null)}
            className="mt-4 w-full rounded-xl bg-primary py-3 font-medium text-primary-foreground"
          >
            再提交一件
          </button>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {step === 0 && (
            <div>
              <p className="text-sm font-medium">想定制什么？</p>
              <p className="mt-0.5 text-xs text-muted">选择你最想要的品类开始</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {CATEGORIES.map((c) => (
                  <Chip key={c} on={draft.category === c} onClick={() => setDraft((d) => ({ ...d, category: c }))}>
                    {c}
                  </Chip>
                ))}
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium">想用什么材料？</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {MATERIALS.map((m) => (
                    <Chip key={m} on={draft.material === m} onClick={() => setDraft((d) => ({ ...d, material: m }))}>
                      {m}
                    </Chip>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium">克重要求（克）</p>
                <input
                  value={draft.weight}
                  onChange={(e) => setDraft((d) => ({ ...d, weight: e.target.value }))}
                  placeholder="如 3-5g，不填则设计师给建议"
                  className="mt-2 w-full rounded-xl bg-black/5 px-3 py-2.5 text-sm outline-none placeholder:text-muted"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium">喜欢什么风格？（可多选）</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {STYLES.map((s) => (
                    <Chip key={s} on={draft.style.includes(s)} onClick={() => setDraft((d) => ({ ...d, style: toggle(d.style, s) }))}>
                      {s}
                    </Chip>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium">大概预算</p>
                <input
                  value={draft.budget}
                  onChange={(e) => setDraft((d) => ({ ...d, budget: e.target.value }))}
                  placeholder="如 ¥5000 以内"
                  className="mt-2 w-full rounded-xl bg-black/5 px-3 py-2.5 text-sm outline-none placeholder:text-muted"
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              {/* 参考图上传（最多 6 张） */}
              <div>
                <p className="text-sm font-medium">参考图（选填，最多 {MAX_REFS} 张）</p>
                <p className="mt-0.5 text-xs text-muted">款式照片、设计稿、风格图均可上传</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {refs.map((url, i) => (
                    <div key={url + i} className="relative h-20 w-20 overflow-hidden rounded-xl">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="参考图" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setRefs((prev) => prev.filter((_, x) => x !== i))}
                        className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/50 text-xs text-white"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  {refs.length < MAX_REFS && (
                    <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-xl border border-dashed border-black/15 text-muted">
                      <span className="text-xl leading-none">+</span>
                      <span className="text-[11px]">{uploading ? "上传中…" : "添加"}</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        multiple
                        className="hidden"
                        onChange={handleRefs}
                        disabled={uploading}
                      />
                    </label>
                  )}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium">主要用途</p>
                <input
                  value={draft.purpose}
                  onChange={(e) => setDraft((d) => ({ ...d, purpose: e.target.value }))}
                  placeholder="如 生日礼物 / 自戴 / 婚戒"
                  className="mt-2 w-full rounded-xl bg-black/5 px-3 py-2.5 text-sm outline-none placeholder:text-muted"
                />
              </div>
              <div>
                <p className="text-sm font-medium">刻字备注</p>
                <input
                  value={draft.engraving}
                  onChange={(e) => setDraft((d) => ({ ...d, engraving: e.target.value }))}
                  placeholder="如 内圈刻 XXX，名字缩写"
                  className="mt-2 w-full rounded-xl bg-black/5 px-3 py-2.5 text-sm outline-none placeholder:text-muted"
                />
              </div>
              <div>
                <p className="text-sm font-medium">补充说明</p>
                <textarea
                  value={draft.notes}
                  onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
                  placeholder="款式偏好、参考照片、特殊要求等（选填）"
                  rows={3}
                  className="mt-2 w-full resize-none rounded-xl bg-black/5 px-3 py-2.5 text-sm outline-none placeholder:text-muted"
                />
              </div>

              {/* 需求单预览 */}
              <div className="rounded-xl bg-black/5 p-4">
                <p className="text-sm font-semibold">需求单预览</p>
                <dl className="mt-2 space-y-1">
                  {(["category", "material", "weight", "budget", "style"] as const)
                    .filter((k) => (k === "style" ? draft.style.length : draft[k]))
                    .map((k) => (
                      <div key={k} className="flex gap-2 text-sm">
                        <dt className="w-10 shrink-0 text-muted">{LABELS[k]}</dt>
                        <dd className="text-foreground">
                          {k === "style" ? draft.style.join("、") : (draft[k] as string)}
                        </dd>
                      </div>
                    ))}
                </dl>
              </div>
            </div>
          )}

          {msg && <p className="text-sm text-danger">{msg}</p>}

          <div className="flex gap-3 pt-1">
            {step > 0 && (
              <button
                onClick={() => setStep((s) => s - 1)}
                disabled={submitting}
                className="w-24 rounded-xl bg-black/5 py-3 text-sm font-medium disabled:opacity-50"
              >
                上一步
              </button>
            )}
            {step < 3 ? (
              <button
                onClick={() => canNext && setStep((s) => s + 1)}
                disabled={!canNext}
                className="flex-1 rounded-xl bg-primary py-3 font-medium text-primary-foreground disabled:opacity-40"
              >
                下一步
              </button>
            ) : (
              <button
                onClick={submit}
                disabled={submitting}
                className="flex-1 rounded-xl bg-primary py-3 font-medium text-primary-foreground disabled:opacity-50"
              >
                {submitting ? "提交中…" : "提交需求单"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}