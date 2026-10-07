"use client";

import { useEffect, useRef } from "react";
import { track } from "@/lib/track";

/** 页面级曝光埋点：挂载时上报一次 page_view（仅客户端，未登录由服务端忽略） */
export function TrackPageView({
  event_type,
  source,
  category_code,
  meta,
}: {
  event_type: string;
  source?: string;
  category_code?: string;
  meta?: Record<string, unknown>;
}) {
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    track({ event_type, source, category_code, meta });
  }, [event_type, source, category_code, meta]);
  return null;
}