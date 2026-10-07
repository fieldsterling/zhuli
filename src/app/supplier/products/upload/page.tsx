"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createBrowserClient } from "@/lib/supabase";
import { useAuthStore } from "@/store/auth";
import type { Database } from "@/types/supabase";

type Supplier = Database["public"]["Tables"]["zhuli_suppliers"]["Row"];

const productSchema = z.object({
  title: z.string().min(2, "请输入商品标题"),
  category: z.string().min(1, "请选择品类"),
  material: z.string().optional(),
  weight_grams: z.coerce.number().positive().optional().nullable(),
  supply_price: z.coerce.number().positive("请输入供货价"),
  stock: z.coerce.number().int().min(0).default(0),
  cert_required: z.boolean().default(true),
});

// 表单输入类型（未经 coerce 转译）与输出类型（已转译）
type ProductFormInput = z.input<typeof productSchema>;
type ProductFormOutput = z.output<typeof productSchema>;
export type { ProductFormInput, ProductFormOutput };

const categoryOptions = ["黄金", "K金", "钻石", "彩宝", "翡翠", "珍珠", "银饰"];

// 边缘函数地址：Supabase 项目函数路径
const COS_SIGN_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/zhuli_cos_sign`;

export default function ProductUploadPage() {
  const router = useRouter();
  const supabase = createBrowserClient();
  const user = useAuthStore((s) => s.user);

  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [images, setImages] = useState<{ file: File; url: string; key: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProductFormInput, any, ProductFormOutput>({
    resolver: zodResolver(productSchema),
    defaultValues: { stock: 0, cert_required: true },
  });

  // 校验供应商身份（进入页面时）
  useEffect(() => {
    if (!user) {
      router.replace("/login");
      return;
    }
    supabase
      .from("zhuli_suppliers")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle()
      .then(({ data }) => {
        if (!data) router.replace("/supplier/apply");
        else setSupplier((data ?? null) as Supplier | null);
      });
  }, [user, supabase, router]);

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setUploading(true);
    setError("");
    const newImages: typeof images = [];

    for (const file of files) {
      // 1) 获取 COS 预签名直传 URL
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const signRes = await fetch(COS_SIGN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, ext, folder: "product" }),
      });
      if (!signRes.ok) {
        setError("获取上传签名失败");
        setUploading(false);
        return;
      }
      const { uploadUrl, publicUrl } = await signRes.json();
      // 2) 直传 COS
      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      if (!putRes.ok) {
        setError("上传文件失败");
        setUploading(false);
        return;
      }
      newImages.push({ file, url: publicUrl, key: "" });
    }
    setImages((prev) => [...prev, ...newImages]);
    setUploading(false);
  }

  function removeImage(idx: number) {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  }

  async function onSubmit(data: ProductFormOutput) {
    if (!supplier) return;
    if (images.length === 0) {
      setError("请至少上传一张商品图片");
      return;
    }
    setSubmitting(true);
    setError("");
    const { error: err } = await supabase
      .from("zhuli_products")
      .insert({
        supplier_id: supplier.id,
        title: data.title,
        category: data.category,
        material: data.material || null,
        weight_grams: data.weight_grams ?? null,
        supply_price: Number(data.supply_price),
        stock: Number(data.stock ?? 0),
        cert_required: data.cert_required,
        images: images.map((i) => i.url),
        status: "pending",
      });
    setSubmitting(false);
    if (err) {
      setError(err.message);
      return;
    }
    router.push("/supplier");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-md px-5 pt-8 pb-10">
      <button onClick={() => router.back()} className="text-sm text-muted">
        ← 返回
      </button>
      <h1 className="mt-3 text-xl font-semibold">上传商品</h1>
      <p className="mt-1 text-sm text-muted">上传后需平台审核通过才会展示</p>

      {/* 图片上传 */}
      <div className="mt-6">
        <p className="mb-2 text-sm font-medium">商品图片</p>
        <div className="flex flex-wrap gap-3">
          {images.map((img, i) => (
            <div key={i} className="relative h-24 w-24 overflow-hidden rounded-xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt="预览" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/50 text-white"
              >
                ✕
              </button>
            </div>
          ))}
          {images.length < 6 && (
            <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-black/15 text-muted">
              <span className="text-2xl">+</span>
              <span className="text-xs">{uploading ? "上传中…" : "添加"}</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                onChange={handleImageChange}
                disabled={uploading}
              />
            </label>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
        <Field label="商品标题" error={errors.title?.message}>
          <input
            className="w-full bg-transparent px-4 py-2.5 text-base outline-none"
            placeholder="如：足金吊坠 XX 克"
            {...register("title")}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="品类" error={errors.category?.message}>
            <select
              className="w-full bg-transparent px-4 py-2.5 text-base outline-none"
              {...register("category")}
            >
              <option value="">选择</option>
              {categoryOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <Field label="材质">
            <input
              className="w-full bg-transparent px-4 py-2.5 text-base outline-none"
              placeholder="如：足金999"
              {...register("material")}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="克重 (g)" error={errors.weight_grams?.message}>
            <input
              type="number"
              step="0.01"
              className="w-full bg-transparent px-4 py-2.5 text-base outline-none"
              placeholder="0.00"
              {...register("weight_grams")}
            />
          </Field>
          <Field label="供货价 (¥)" error={errors.supply_price?.message}>
            <input
              type="number"
              step="0.01"
              className="w-full bg-transparent px-4 py-2.5 text-base outline-none"
              placeholder="0.00"
              {...register("supply_price")}
            />
          </Field>
        </div>

        <Field label="库存" error={errors.stock?.message}>
          <input
            type="number"
            className="w-full bg-transparent px-4 py-2.5 text-base outline-none"
            {...register("stock")}
          />
        </Field>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="h-4 w-4" {...register("cert_required")} />
          需附带质检证书
        </label>

        {error && <p className="text-sm text-danger">{error}</p>}

        <button
          type="submit"
          disabled={submitting || uploading}
          className="w-full rounded-2xl bg-primary py-3.5 font-medium text-primary-foreground disabled:opacity-50"
        >
          {submitting ? "提交中…" : "提交审核"}
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