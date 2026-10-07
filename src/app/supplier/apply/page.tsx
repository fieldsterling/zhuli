"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createBrowserClient } from "@/lib/supabase";
import { useAuthStore } from "@/store/auth";

const applySchema = z.object({
  name: z.string().min(2, "请输入档口/品牌名"),
  contact_name: z.string().min(1, "请输入联系人"),
  contact_phone: z.string().regex(/^1\d{10}$/, "请输入 11 位手机号"),
  stall_address: z.string().optional(),
  category: z.string().min(1, "请选择主营品类"),
});
type ApplyData = z.infer<typeof applySchema>;

const categoryOptions = ["黄金", "K金", "钻石", "彩宝", "翡翠", "珍珠", "银饰"];

export default function SupplierApplyPage() {
  const router = useRouter();
  const supabase = createBrowserClient();
  const user = useAuthStore((s) => s.user);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ApplyData>({ resolver: zodResolver(applySchema) });

  async function onSubmit(data: ApplyData) {
    if (!user) {
      router.push("/login");
      return;
    }
    setSubmitting(true);
    setError("");
    const { data: ins, error: err } = await supabase
      .from("zhuli_suppliers")
      .insert({
        user_id: user.id,
        name: data.name,
        contact_name: data.contact_name,
        contact_phone: data.contact_phone,
        stall_address: data.stall_address || null,
        category: [data.category],
      })
      .select()
      .maybeSingle();
    setSubmitting(false);
    if (err) {
      setError(err.message);
      return;
    }
    void ins;
    // 申请后状态 active；实际可改为 pending，由管理员审核。此处直接可用便于本地演示。
    router.push("/supplier");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-md px-5 pt-8">
      <button onClick={() => router.back()} className="text-sm text-muted">
        ← 返回
      </button>
      <h1 className="mt-3 text-xl font-semibold">申请成为供应商</h1>
      <p className="mt-1 text-sm text-muted">资料审核通过后可上传商品</p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
        <Field label="档口 / 品牌名" error={errors.name?.message}>
          <input
            className="w-full bg-transparent px-4 py-2.5 text-base outline-none"
            placeholder="如：水贝珠宝·金店"
            {...register("name")}
          />
        </Field>

        <Field label="联系人" error={errors.contact_name?.message}>
          <input
            className="w-full bg-transparent px-4 py-2.5 text-base outline-none"
            placeholder="联系人姓名"
            {...register("contact_name")}
          />
        </Field>

        <Field label="联系电话" error={errors.contact_phone?.message}>
          <input
            type="tel"
            inputMode="tel"
            className="w-full bg-transparent px-4 py-2.5 text-base outline-none"
            placeholder="11 位手机号"
            {...register("contact_phone")}
          />
        </Field>

        <Field label="档口地址（选填）">
          <input
            className="w-full bg-transparent px-4 py-2.5 text-base outline-none"
            placeholder="如水贝工业区 X 栋"
            {...register("stall_address")}
          />
        </Field>

        <Field label="主营品类" error={errors.category?.message}>
          <select
            className="w-full bg-transparent px-4 py-2.5 text-base outline-none"
            {...register("category")}
          >
            <option value="">请选择</option>
            {categoryOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>

        {error && <p className="text-sm text-danger">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-2xl bg-primary py-3.5 font-medium text-primary-foreground disabled:opacity-50"
        >
          {submitting ? "提交中…" : "提交申请"}
        </button>
      </form>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">{label}</label>
      <div className="glass p-1">{children}</div>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}