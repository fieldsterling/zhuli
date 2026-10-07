// 共享常量：认证 access_token 的 cookie 名（客户端写入，服务端读取）。
// 与 supabase 会话解耦，供 Client 组件与 Server Action 共用。
export const AUTH_TOKEN_COOKIE = "zhuli_uat";