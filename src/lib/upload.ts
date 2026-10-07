"use client";

/**
 * COS 直传工具：所有上传统一走 Supabase 边缘函数 zhuli_cos_sign 取预签名 URL，
 * 再由浏览器 PUT 直传到腾讯云 COS 的 zhuli/{folder}/ 目录。
 * folder 白名单见边缘函数（product/design/avatar/video/doc/misc）。
 */

const COS_SIGN_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/zhuli_cos_sign`;

export type UploadFolder = "product" | "design" | "avatar" | "video" | "doc" | "misc";

/** 单张直传：返回可公开访问的 URL；失败抛错。 */
export async function uploadToCos(file: File, folder: UploadFolder = "misc"): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const signRes = await fetch(COS_SIGN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName: file.name, ext, folder }),
  });
  if (!signRes.ok) {
    const body = await signRes.json().catch(() => null);
    throw new Error(body?.error || "获取上传签名失败");
  }
  const { uploadUrl, publicUrl } = await signRes.json();
  const putRes = await fetch(uploadUrl, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type },
  });
  if (!putRes.ok) throw new Error("上传文件失败");
  return publicUrl as string;
}

/** 并发上传多张：返回 URL 数组，任一张失败则抛错。 */
export async function uploadManyToCos(files: File[], folder: UploadFolder): Promise<string[]> {
  return Promise.all(files.map((f) => uploadToCos(f, folder)));
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("图片加载失败"));
    img.src = url;
  });
}

/**
 * 把图片按目标宽高比「居中裁切」，再等比缩放到不超过 maxSize 的宽度，输出为 WebP 文件。
 * ratio = 宽 / 高。用于首页背景等需要固定比例的场景：比例不对时统一居中裁掉多余部分。
 */
export async function cropToRatio(file: File, ratio: number, maxSize = 1000): Promise<File> {
  const img = await loadImage(file);
  const srcW = img.naturalWidth || 1;
  const srcH = img.naturalHeight || 1;
  const srcRatio = srcW / srcH;
  let cw = srcW;
  let ch = srcH;
  let cx = 0;
  let cy = 0;
  if (srcRatio > ratio) {
    cw = srcH * ratio;
    cx = (srcW - cw) / 2;
  } else if (srcRatio < ratio) {
    ch = srcW / ratio;
    cy = (srcH - ch) / 2;
  }
  const outW = Math.min(cw, maxSize);
  const outH = outW / ratio;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(outW);
  canvas.height = Math.round(outH);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("无法创建图像画布");
  ctx.drawImage(img, cx, cy, cw, ch, 0, 0, outW, outH);
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("图片压缩失败"))), "image/webp", 0.88)
  );
  const base = (file.name.replace(/\.[^.]+$/, "") || "bg").slice(0, 30);
  return new File([blob], `${base}.webp`, { type: "image/webp" });
}