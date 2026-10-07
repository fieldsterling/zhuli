import { trackBehavior, type TrackInput } from "@/app/actions/behavior";

const VISITOR_KEY = "zhuli_visitor_id";

/** 读取（或惰性生成并持久化）本机匿名访客 ID：未登录行为以它标识，登录后据此合并回填。 */
export function getVisitorId(): string | undefined {
  if (typeof window === "undefined" || typeof localStorage === "undefined") return undefined;
  try {
    let v = localStorage.getItem(VISITOR_KEY);
    if (!v) {
      v = crypto.randomUUID();
      localStorage.setItem(VISITOR_KEY, v);
    }
    return v;
  } catch {
    return undefined;
  }
}

/** 前端埋点：向服务端 action 记账（fire-and-forget，不抛错、无阻塞）。未登录自动带上匿名 visitorId。 */
export function track(input: TrackInput) {
  // 脚手架 stage 清理，避免 build 期意外执行
  if (typeof window === "undefined") return;
  try {
    void trackBehavior(input, getVisitorId());
  } catch {
    /* 静默 */
  }
}

export type { TrackInput };