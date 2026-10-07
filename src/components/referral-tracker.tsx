"use client";

import { useEffect, useRef } from "react";
import { useAuthStore } from "@/store/auth";
import { bindReferrer } from "@/app/actions/auth";

const LS_REF = "zhuli_ref";
const LS_DONE = "zhuli_ref_done";

/**
 * 推广来源捕获：进站 URL 带 ?ref=分享码（或本地暂存未绑定）时，
 * 用户登录后把来源归属到该推广者（只绑定一次）。
 */
export function ReferralTracker() {
  const user = useAuthStore((s) => s.user);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    if (typeof window === "undefined") return;

    let ref: string | null = null;
    try {
      ref = new URL(window.location.href).searchParams.get("ref");
      if (!ref) ref = localStorage.getItem(LS_REF);
    } catch {
      ref = null;
    }
    if (!ref) return;
    ref = ref.trim().toUpperCase();

    const done = new Set((localStorage.getItem(LS_DONE) ?? "").split(",").filter(Boolean));
    if (done.has(ref)) return;

    // 未登录则先暂存，待登录后再绑定
    if (ref) localStorage.setItem(LS_REF, ref);
    if (!user) return;

    ran.current = true;
    bindReferrer(ref).finally(() => {
      done.add(ref);
      localStorage.setItem(LS_DONE, [...done].join(","));
      localStorage.removeItem(LS_REF);
    });
  }, [user]);

  return null;
}