"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  listManualTransfers,
  verifyTransfer,
  rejectTransfer,
  type AdminOrder,
} from "@/app/actions/admin-order";
import {
  adminListProducts,
  adminListSupplierApplications,
  adminListTasks,
  adminListRoleApplications,
  adminListReferrers,
  adminReviewProduct,
  adminReviewSupplier,
  adminReviewRoleApplication,
  adminReviewReferrer,
} from "@/app/actions/admin";
import { roleBadge } from "@/lib/badge";
import {
  adminListCatalog,
  adminSetCatalogProduct,
  adminListCustomerEntities,
  adminSetUserEntities,
} from "@/app/actions/admin-catalog";
import { adminListProfiles, adminUpsertProfile } from "@/app/actions/admin-profile";
import { adminRunBehaviorReport } from "@/app/actions/behavior";
import { adminListSiteConfig, adminSetSiteConfig, adminSetRecConfig } from "@/app/actions/admin-site";
import { useAuthStore } from "@/store/auth";
import { uploadToCos, cropToRatio } from "@/lib/upload";

const TABS = [
  { key: "transfers", label: "核销转账" },
  { key: "roleapps", label: "资格审批" },
  { key: "referrers", label: "推广管理" },
  { key: "customers", label: "客户" },
  { key: "products", label: "商品审核" },
  { key: "tasks", label: "需求" },
  { key: "suppliers", label: "供应商审批" },
  { key: "catalog", label: "产品目录" },
  { key: "site", label: "站点外观" },
  { key: "image", label: "以图搜图" },
] as const;
type Tab = (typeof TABS)[number]["key"];

const ROLE_LABEL: Record<string, string> = {
  admin: "管理员",
  supplier: "供应商",
  buyer: "买手",
  customer_b: "B端客户",
  customer_c: "个人客户",
};
const PROD_STATUS: Record<string, string> = {
  pending: "待审核",
  listed: "已上架",
  rejected: "已驳回",
  draft: "草稿",
};
const TASK_TYPE: Record<string, string> = { find: "找货", proxy: "代购", qc: "质检", errand: "跑腿" };
const TASK_STATUS: Record<string, string> = {
  open: "待接单",
  quoted: "已报价",
  confirmed: "已确认",
  in_progress: "进行中",
  completed: "已完成",
  settled: "已结算",
};

export function AdminConsole() {
  const [tab, setTab] = useState<Tab>("transfers");
  return (
    <div className="p-5 pb-20">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">平台管理后台</h1>
      </div>

      {/* 顶部标签 */}
      <div className="mt-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={
              tab === t.key
                ? "rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
                : "rounded-lg bg-black/5 px-3 py-1.5 text-sm font-medium"
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {tab === "transfers" && <TabTransfers />}
        {tab === "roleapps" && <TabRoleApps />}
        {tab === "referrers" && <TabReferrers />}
        {tab === "customers" && <TabCustomers />}
        {tab === "products" && <TabProducts />}
        {tab === "tasks" && <TabTasks />}
        {tab === "suppliers" && <TabSuppliers />}
        {tab === "catalog" && <TabCatalog />}
        {tab === "site" && <TabSite />}
        {tab === "image" && <TabImageSearch />}
      </div>
    </div>
  );
}

/* ---------------- 核销转账 ---------------- */
function TabTransfers() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await listManualTransfers();
    setLoading(false);
    if (res.error) {
      setMsg(res.error);
      return;
    }
    setMsg("");
    setOrders(res.orders ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function act(orderId: string, kind: "verify" | "reject") {
    setBusyId(orderId);
    setMsg("");
    const res = kind === "verify" ? await verifyTransfer(orderId) : await rejectTransfer(orderId);
    setBusyId(null);
    if (res.error) {
      setMsg(res.error);
      return;
    }
    await load();
  }

  if (loading)
    return (
      <div className="space-y-3">
        {[0, 1].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-black/5" />
        ))}
      </div>
    );

  return (
    <div>
      <p className="text-sm text-muted">待核销 {orders.length} 笔（用户标记「我已转账」）</p>
      {orders.length === 0 ? (
        <div className="glass mt-4 rounded-2xl p-8 text-center">
          <p className="text-sm text-muted">暂无待核销订单</p>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {orders.map((o) => {
            const addr = o.address ?? {};
            return (
              <div key={o.id} className="glass rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted">{o.order_no}</span>
                  <span className="text-sm font-semibold text-amber-600">
                    ¥{Number(o.total_amount ?? 0).toLocaleString()}
                  </span>
                </div>
                <div className="mt-3 space-y-2">
                  {o.zhuli_order_items.map((it) => {
                    const snap = it.snapshot ?? {};
                    return (
                      <div key={it.id} className="flex items-center gap-2 text-sm">
                        {snap.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={snap.image} alt={snap.title ?? "商品"} className="h-10 w-10 shrink-0 rounded-lg object-cover" />
                        ) : (
                          <div className="h-10 w-10 shrink-0 rounded-lg bg-black/5" />
                        )}
                        <span className="min-w-0 flex-1 truncate">{snap.title ?? "商品"}</span>
                        <span className="shrink-0 text-muted">×{it.quantity}</span>
                      </div>
                    );
                  })}
                </div>
                {addr.full && (
                  <p className="mt-3 text-xs leading-relaxed text-muted">
                    {addr.receiver} · {addr.phone} <br /> {addr.full}
                  </p>
                )}
                <div className="mt-3 flex items-center justify-between border-t border-black/5 pt-3">
                  <span className="text-xs text-muted">{new Date(o.created_at).toLocaleString("zh-CN")}</span>
                  <div className="flex gap-2">
                    <button onClick={() => act(o.id, "reject")} disabled={busyId === o.id} className="rounded-lg bg-black/5 px-4 py-2 text-sm font-medium disabled:opacity-50">
                      拒付
                    </button>
                    <button onClick={() => act(o.id, "verify")} disabled={busyId === o.id} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
                      {busyId === o.id ? "处理中…" : "核销已到账"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {msg && <p className="mt-4 text-sm text-danger">{msg}</p>}
    </div>
  );
}

/* ---------------- 资格审批（供应商/跑腿买手入驻申请） ---------------- */
function TabRoleApps() {
  const [rows, setRows] = useState<Array<Record<string, any>>>([]);
  const [msg, setMsg] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const load = useCallback(async () => {
    const res = await adminListRoleApplications();
    if ("error" in res) setMsg(res.error);
    else setRows(res.data);
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  async function act(id: string, status: "approved" | "rejected") {
    setBusyId(id);
    const res = await adminReviewRoleApplication(id, status);
    setBusyId(null);
    if ("error" in res) setMsg(res.error);
    else await load();
  }
  const pending = rows.filter((r) => r.status === "pending");
  return (
    <div>
      <p className="text-sm text-muted">供应商 / 跑腿买手入驻申请 · 待审批 {pending.length} 条</p>
      {msg && <p className="mt-2 text-sm text-danger">{msg}</p>}
      <div className="mt-4 space-y-3">
        {rows.length === 0 && <div className="glass rounded-2xl p-8 text-center text-sm text-muted">暂无申请</div>}
        {rows.map((a) => (
          <div key={a.id} className="glass rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  {ROLE_LABEL[a.role] ?? a.role}
                </span>
                <span className="text-xs text-muted">
                  {a.status === "pending" ? "待审批" : a.status === "approved" ? "已通过" : "已驳回"}
                </span>
              </div>
              <span className="text-xs text-muted">{new Date(a.created_at).toLocaleString("zh-CN")}</span>
            </div>
            <p className="mt-2 text-sm font-medium">{a.zhuli_users?.nickname || a.zhuli_users?.phone || "用户"}</p>
            {a.zhuli_users?.phone && <p className="mt-0.5 text-xs text-muted">{a.zhuli_users.phone}</p>}
            {a.note && <p className="mt-2 rounded-lg bg-black/5 px-3 py-2 text-xs">备注：{a.note}</p>}
            {a.status === "pending" && (
              <div className="mt-3 flex gap-2">
                <button onClick={() => act(a.id, "rejected")} disabled={busyId === a.id} className="rounded-lg bg-black/5 px-4 py-2 text-sm font-medium disabled:opacity-50">
                  驳回
                </button>
                <button onClick={() => act(a.id, "approved")} disabled={busyId === a.id} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
                  {busyId === a.id ? "处理中…" : "通过"}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- 推广管理 ---------------- */
function TabReferrers() {
  const [rows, setRows] = useState<Array<Record<string, any>>>([]);
  const [msg, setMsg] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const load = useCallback(async () => {
    const res = await adminListReferrers();
    if ("error" in res) setMsg(res.error);
    else setRows(res.data);
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  async function act(id: string, status: "approved" | "rejected") {
    setBusyId(id);
    const res = await adminReviewReferrer(id, status);
    setBusyId(null);
    if ("error" in res) setMsg(res.error);
    else await load();
  }
  const pending = rows.filter((r) => r.status === "pending");
  return (
    <div>
      <p className="text-sm text-muted">推广者 · 待审批 {pending.length} 条</p>
      {msg && <p className="mt-2 text-sm text-danger">{msg}</p>}
      <div className="mt-4 space-y-3">
        {rows.length === 0 && <div className="glass rounded-2xl p-8 text-center text-sm text-muted">暂无推广者</div>}
        {rows.map((r) => (
          <div key={r.id} className="glass rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-[#c9a227] px-2 py-0.5 text-xs font-semibold text-white">T</span>
                <span className="font-mono text-sm font-semibold">/{r.code}</span>
                <span className="text-xs text-muted">
                  {r.status === "pending" ? "待审批" : r.status === "approved" ? "已通过" : "已驳回"}
                </span>
              </div>
              <span className="text-xs text-muted">{new Date(r.created_at).toLocaleString("zh-CN")}</span>
            </div>
            <p className="mt-1.5 text-sm font-medium">
              {r.zhuli_users?.nickname || r.zhuli_users?.phone || "用户"}
              {r.label ? `（${r.label}）` : ""}
            </p>
            {r.zhuli_users?.phone && <p className="text-xs text-muted">{r.zhuli_users.phone}</p>}
            <p className="mt-2 text-xs text-muted">
              归属：{r.ref_users ?? 0} 用户 · {r.order_count ?? 0} 订单 · {r.task_count ?? 0} 需求
            </p>
            {r.status === "pending" && (
              <div className="mt-3 flex gap-2">
                <button onClick={() => act(r.id, "rejected")} disabled={busyId === r.id} className="rounded-lg bg-black/5 px-4 py-2 text-sm font-medium disabled:opacity-50">
                  驳回
                </button>
                <button onClick={() => act(r.id, "approved")} disabled={busyId === r.id} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
                  {busyId === r.id ? "处理中…" : "通过"}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- 客户 ---------------- */
type CustomerRow = {
  id: string;
  phone?: string | null;
  nickname?: string | null;
  company_name?: string | null;
  role?: string | null;
  created_at?: string | null;
};

/* ---- 客户档案编辑 ---- */
const SELECT_CLS =
  "w-full rounded-lg border border-black/10 bg-white/60 px-3 py-2 text-sm outline-none focus:border-primary";
const INPUT_CLS = SELECT_CLS;

function Fl({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block min-w-0 flex-1">
      <span className="mb-1 block text-xs text-muted">{label}</span>
      {children}
    </label>
  );
}
function splitText(v: unknown): string {
  if (Array.isArray(v)) return v.join("，");
  return v ? String(v) : "";
}
const arr = (v: string): string[] =>
  v
    .split(/[,，]/)
    .map((s) => s.trim())
    .filter(Boolean);

const VERIFY_OPTS = ["未认证", "手机", "实名", "企业", "深度"];
const ACCT_OPTS = ["待审核", "正常", "受限", "冻结", "注销"];
const AI_OPTS = ["手工", "Excel", "轻量ERP", "全链路", "智能化"];
const BAND_OPTS = ["低端", "中端", "中高端", "高端", "顶级"];
const ADMIN_STATUS_OPTS = ["正常", "观察", "限制", "拉黑", "白名单优选", "核心"];

function ProfileForm({
  pd,
  on,
  onClose,
  onSave,
  busy,
}: {
  pd: Record<string, any>;
  on: (k: string, v: any) => void;
  onClose: () => void;
  onSave: () => void;
  busy: boolean;
}) {
  const num = (v: any) => (v == null ? "—" : Number(v).toLocaleString("zh-CN"));
  return (
    <div className="mt-3 space-y-4 border-t border-black/5 pt-3">
      {/* 身份识别 */}
      <section>
        <p className="text-xs font-semibold text-primary">身份识别</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Fl label="主体类型">
            <input className={INPUT_CLS} value={pd.entity_type ?? ""} onChange={(e) => on("entity_type", e.target.value)} placeholder="如 工厂/档口/贸易公司" />
          </Fl>
          <Fl label="细分类型">
            <input className={INPUT_CLS} value={pd.entity_subtype ?? ""} onChange={(e) => on("entity_subtype", e.target.value)} />
          </Fl>
          <Fl label="对外名称">
            <input className={INPUT_CLS} value={pd.display_name ?? ""} onChange={(e) => on("display_name", e.target.value)} />
          </Fl>
          <Fl label="法定名称">
            <input className={INPUT_CLS} value={pd.legal_name ?? ""} onChange={(e) => on("legal_name", e.target.value)} />
          </Fl>
          <Fl label="统一社会信用代码">
            <input className={INPUT_CLS} value={pd.unified_social_credit_code ?? ""} onChange={(e) => on("unified_social_credit_code", e.target.value)} />
          </Fl>
          <Fl label="身份证哈希">
            <input className={INPUT_CLS} value={pd.id_card_hash ?? ""} onChange={(e) => on("id_card_hash", e.target.value)} />
          </Fl>
          <Fl label="认证等级">
            <select className={SELECT_CLS} value={pd.verification_level ?? "未认证"} onChange={(e) => on("verification_level", e.target.value)}>
              {VERIFY_OPTS.map((o) => <option key={o}>{o}</option>)}
            </select>
          </Fl>
          <Fl label="账号状态">
            <select className={SELECT_CLS} value={pd.account_status ?? "待审核"} onChange={(e) => on("account_status", e.target.value)}>
              {ACCT_OPTS.map((o) => <option key={o}>{o}</option>)}
            </select>
          </Fl>
        </div>
      </section>

      {/* 联系与位置 */}
      <section>
        <p className="text-xs font-semibold text-primary">联系与位置</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Fl label="联系电话">
            <input className={INPUT_CLS} value={pd.contact_phone ?? ""} onChange={(e) => on("contact_phone", e.target.value)} />
          </Fl>
          <Fl label="微信">
            <input className={INPUT_CLS} value={pd.contact_wechat ?? ""} onChange={(e) => on("contact_wechat", e.target.value)} />
          </Fl>
          <Fl label="经营地址">
            <input className={INPUT_CLS} value={pd.operating_address ?? ""} onChange={(e) => on("operating_address", e.target.value)} />
          </Fl>
          <Fl label="服务覆盖区域（逗号分隔）">
            <input className={INPUT_CLS} value={splitText(pd.service_region)} onChange={(e) => on("service_region", arr(e.target.value))} placeholder="如 深圳，广州" />
          </Fl>
          <Fl label="线上渠道（逗号分隔）">
            <input className={INPUT_CLS} value={splitText(pd.online_presence)} onChange={(e) => on("online_presence", arr(e.target.value))} placeholder="如 抖音，微信，淘宝" />
          </Fl>
        </div>
      </section>

      {/* 产业链角色与能力 */}
      <section>
        <p className="text-xs font-semibold text-primary">产业链角色与能力</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Fl label="主要角色">
            <input className={INPUT_CLS} value={pd.chain_role_primary ?? ""} onChange={(e) => on("chain_role_primary", e.target.value)} placeholder="如 工厂/档口/零售" />
          </Fl>
          <Fl label="经营产品类别（逗号分隔）">
            <input className={INPUT_CLS} value={splitText(pd.product_categories)} onChange={(e) => on("product_categories", arr(e.target.value))} />
          </Fl>
          <Fl label="材质能力（逗号分隔）">
            <input className={INPUT_CLS} value={splitText(pd.material_capabilities)} onChange={(e) => on("material_capabilities", arr(e.target.value))} placeholder="如 黄金，K金，钻石" />
          </Fl>
          <Fl label="工艺能力（逗号分隔）">
            <input className={INPUT_CLS} value={splitText(pd.craft_capabilities)} onChange={(e) => on("craft_capabilities", arr(e.target.value))} placeholder="如 失蜡，CNC，镶嵌" />
          </Fl>
          <Fl label="核心资质（逗号分隔）">
            <input className={INPUT_CLS} value={splitText(pd.certifications)} onChange={(e) => on("certifications", arr(e.target.value))} placeholder="如 营业执照，质检" />
          </Fl>
          <Fl label="数字化/AI 等级">
            <select className={SELECT_CLS} value={pd.digital_ai_level ?? ""} onChange={(e) => on("digital_ai_level", e.target.value)}>
              <option value="">—</option>
              {AI_OPTS.map((o) => <option key={o}>{o}</option>)}
            </select>
          </Fl>
        </div>
      </section>

      {/* 管理员标签与状态 */}
      <section>
        <p className="text-xs font-semibold text-primary">管理员标签与状态</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Fl label="价格带">
            <select className={SELECT_CLS} value={pd.price_band ?? ""} onChange={(e) => on("price_band", e.target.value)}>
              <option value="">—</option>
              {BAND_OPTS.map((o) => <option key={o}>{o}</option>)}
            </select>
          </Fl>
          <Fl label="管理员标签（逗号分隔）">
            <input className={INPUT_CLS} value={splitText(pd.admin_tags)} onChange={(e) => on("admin_tags", arr(e.target.value))} placeholder="如 优质供应商，重点培养" />
          </Fl>
          <Fl label="综合评级（1–5）">
            <select className={SELECT_CLS} value={pd.admin_rating ?? ""} onChange={(e) => on("admin_rating", e.target.value)}>
              <option value="">—</option>
              {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} 星</option>)}
            </select>
          </Fl>
          <Fl label="管理员状态">
            <select className={SELECT_CLS} value={pd.admin_status ?? "正常"} onChange={(e) => on("admin_status", e.target.value)}>
              {ADMIN_STATUS_OPTS.map((o) => <option key={o}>{o}</option>)}
            </select>
          </Fl>
        </div>
        <label className="mt-2 block">
          <span className="mb-1 block text-xs text-muted">管理员备注</span>
          <textarea
            className={INPUT_CLS}
            rows={2}
            value={pd.admin_notes ?? ""}
            onChange={(e) => on("admin_notes", e.target.value)}
          />
        </label>
      </section>

      {/* 只读系统指标 */}
      <section>
        <p className="text-xs font-semibold text-muted">系统指标（只读）</p>
        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted sm:grid-cols-3">
          <p>信用分：{num(pd.credit_score)}</p>
          <p>风险分：{num(pd.risk_score)}</p>
          <p>合作指数：{pd.cooperation_index ?? "—"}</p>
          <p>累计订单：{num(pd.total_orders)}</p>
          <p>累计销售额：{num(pd.total_sales)}</p>
          <p>客单价：{num(pd.avg_order_value)}</p>
          <p>复购率：{pd.repeat_purchase_rate ?? "—"}</p>
          <p>纠纷次数：{num(pd.dispute_count)}</p>
          <p>平均响应：{pd.response_time_avg ?? "—"}</p>
          <p>最后活跃：{pd.last_active_at ? new Date(pd.last_active_at).toLocaleString("zh-CN") : "—"}</p>
        </div>
      </section>

      <div className="flex gap-2">
        <button onClick={onClose} disabled={busy} className="rounded-lg bg-black/5 px-4 py-2 text-sm font-medium disabled:opacity-50">
          取消
        </button>
        <button onClick={onSave} disabled={busy} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
          {busy ? "保存中…" : "保存档案"}
        </button>
      </div>
    </div>
  );
}

function TabCustomers() {
  const [rows, setRows] = useState<CustomerRow[]>([]);
  const [entities, setEntities] = useState<Array<Record<string, any>>>([]);
  const [userEntities, setUserEntities] = useState<Array<Record<string, any>>>([]);
  const [profilesByUser, setProfilesByUser] = useState<Record<string, any>>({});
  const [msg, setMsg] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [profId, setProfId] = useState<string | null>(null);
  const [profDraft, setProfDraft] = useState<Record<string, any>>({});
  const [profBusy, setProfBusy] = useState(false);
  const [reportBusy, setReportBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await adminListProfiles();
    if ("error" in res) setMsg(res.error);
    else {
      setRows(res.users);
      setProfilesByUser(res.profilesByUser);
    }
    const ent = await adminListCustomerEntities();
    if ("error" in ent) setMsg(ent.error);
    else {
      setEntities(ent.entities);
      setUserEntities(ent.userEntities);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  // user_id -> entity id set
  const userEntMap: Record<string, Set<string>> = {};
  for (const ue of userEntities) {
    (userEntMap[ue.user_id] ??= new Set()).add(ue.entity_id);
  }
  const entName: Record<string, string> = Object.fromEntries(entities.map((e) => [e.id, e.name]));

  function openEdit(u: string) {
    setDraft(new Set(userEntMap[u] ?? []));
    setEditingId(u);
    setMsg("");
  }
  async function save() {
    if (!editingId) return;
    setSaving(true);
    setMsg("");
    const res = await adminSetUserEntities(editingId, Array.from(draft));
    setSaving(false);
    if (res.error) {
      setMsg(res.error);
      return;
    }
    setEditingId(null);
    await load();
  }

  function openProf(u: string) {
    const p = profilesByUser[u] ?? {};
    setProfDraft({ ...p });
    setProfId(u);
    setMsg("");
  }
  function patch(k: string, v: any) {
    setProfDraft((d) => ({ ...d, [k]: v }));
  }
  async function saveProf() {
    if (!profId) return;
    setProfBusy(true);
    setMsg("");
    const res = await adminUpsertProfile(profId, profDraft);
    setProfBusy(false);
    if (res.error) {
      setMsg(res.error);
      return;
    }
    setProfId(null);
    await load();
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted">注册客户（共 {rows.length} 条）</p>
        <button
          onClick={async () => {
            setReportBusy(true);
            setMsg("");
            const res = await adminRunBehaviorReport();
            setReportBusy(false);
            if (res.error) setMsg(res.error);
            else setMsg(`更新成功，处理了 ${res.updated} 条用户数据`);
            load();
          }}
          disabled={reportBusy}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {reportBusy ? "更新中…" : "更新行为汇总到档案"}
        </button>
      </div>
      {msg && <p className="mt-2 text-sm text-danger">{msg}</p>}
      <div className="mt-4 space-y-2">
        {rows.length === 0 && <div className="glass rounded-2xl p-8 text-center text-sm text-muted">暂无客户</div>}
        {rows.map((u) => {
          const tags = Array.from(userEntMap[u.id] ?? []).map((id) => entName[id]);
          const showProf = profId === u.id;
          return (
            <div key={u.id} className="glass rounded-2xl px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {(u.nickname || u.phone || "客").slice(0, 1)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{u.nickname || u.phone || "未命名用户"}</p>
                  <p className="truncate text-xs text-muted">{u.phone || u.company_name || "—"}</p>
                </div>
                {editingId !== u.id && !showProf &&
                  <span
                    className="shrink-0 px-2 py-0.5 text-xs font-semibold text-white"
                    style={{ background: roleBadge(u.role ?? "", false).color, borderRadius: 999 }}
                    title={roleBadge(u.role ?? "", false).label}
                  >
                    {roleBadge(u.role ?? "", false).letter}
                  </span>}
              </div>

              {/* 主体标签（编辑态） */}
              {editingId === u.id ? (
                <div className="mt-3 border-t border-black/5 pt-3">
                  <p className="flex flex-wrap gap-1.5">
                    {entities.map((e) => {
                      const on = draft.has(e.id);
                      return (
                        <button
                          key={e.id}
                          onClick={() => {
                            const d = new Set(draft);
                            if (on) d.delete(e.id);
                            else d.add(e.id);
                            setDraft(d);
                          }}
                          className={
                            on
                              ? "rounded-full bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground"
                              : "rounded-full bg-black/5 px-2.5 py-1 text-xs font-medium"
                          }
                        >
                          {e.name}
                        </button>
                      );
                    })}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => setEditingId(null)} disabled={saving} className="rounded-lg bg-black/5 px-4 py-2 text-sm font-medium disabled:opacity-50">取消</button>
                    <button onClick={save} disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">{saving ? "保存中…" : "保存标签"}</button>
                  </div>
                </div>
              ) : (
                <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-black/5 pt-2">
                  {tags.length === 0 ? (
                    <span className="text-xs text-muted">未设置主体</span>
                  ) : (
                    tags.map((t) => (
                      <span key={t} className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">{t}</span>
                    ))
                  )}
                  <div className="ml-auto flex gap-2">
                    <button onClick={() => openProf(u.id)} className="rounded-lg bg-black/5 px-3 py-1 text-xs font-medium">编辑档案</button>
                    <button onClick={() => openEdit(u.id)} className="rounded-lg bg-black/5 px-3 py-1 text-xs font-medium">设主体</button>
                  </div>
                </div>
              )}

              {/* 档案（编辑态） */}
              {showProf && (
                <ProfileForm
                  pd={profDraft}
                  on={patch}
                  onClose={() => setProfId(null)}
                  onSave={saveProf}
                  busy={profBusy}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- 产品目录 ---------------- */
const CATALOG_STATUS: Record<string, string> = { listed: "已上架", off: "下架" };

function priceFmt(p: Record<string, any>) {
  const num = (v: any) => (v == null ? null : Number(v).toLocaleString("zh-CN"));
  const min = num(p.price_min);
  const max = num(p.price_max);
  if (min != null && max != null) {
    const s = `¥${min} ~ ¥${max}`;
    return p.price_period && p.price_period !== "一次性" ? `${s}（${p.price_period}）` : s;
  }
  return p.price_raw || "—";
}

function TabCatalog() {
  const [categories, setCategories] = useState<Array<Record<string, any>>>([]);
  const [products, setProducts] = useState<Array<Record<string, any>>>([]);
  const [entities, setEntities] = useState<Array<Record<string, any>>>([]);
  const [productEntities, setProductEntities] = useState<Array<Record<string, any>>>([]);
  const [selL1, setSelL1] = useState<string | null>(null);
  const [selL2, setSelL2] = useState<string | null>(null);
  const [kindFilter, setKindFilter] = useState<"all" | "service" | "ai">("all");
  const [msg, setMsg] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await adminListCatalog();
    if ("error" in res) {
      setMsg(res.error);
      return;
    }
    setCategories(res.categories ?? []);
    setProducts(res.products ?? []);
    setEntities(res.entities ?? []);
    setProductEntities(res.productEntities ?? []);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  // 默认选中第一个一级分类（分类数据异步到达后）
  useEffect(() => {
    if (selL1 === null && categories.length) {
      const first = categories.find((c) => c.level === 1 || !c.parent_id);
      if (first) setSelL1(first.id);
    }
  }, [selL1, categories]);

  const l1s = categories.filter((c) => c.level === 1 || !c.parent_id);
  const l2s = categories.filter((c) => c.parent_id === selL1);
  const activeCatId = selL2 ?? selL1;
  const validIds = new Set(categories.filter((c) => (selL2 ? c.id === selL2 : c.parent_id === selL1 || c.id === selL1)).map((c) => c.id));
  const shown = products
    .filter((p) => activeCatId && validIds.has(p.category_id))
    .filter((p) => kindFilter === "all" || p.kind === kindFilter);

  const entName: Record<string, string> = Object.fromEntries(entities.map((e) => [e.id, e.name]));

  async function toggle(p: Record<string, any>) {
    setBusyId(p.id);
    setMsg("");
    const next = p.status === "listed" ? "off" : "listed";
    const res = await adminSetCatalogProduct(p.id, next);
    setBusyId(null);
    if (res.error) setMsg(res.error);
    else await load();
  }

  return (
    <div>
      <p className="text-sm text-muted">产品服务目录 · 来自《产品服务.txt》+《ai产品.txt》，管理员可上架/下架</p>
      {msg && <p className="mt-2 text-sm text-danger">{msg}</p>}

      {/* 种类筛选 */}
      <div className="mt-3 flex flex-wrap gap-2">
        {(["all", "service", "ai"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setKindFilter(k)}
            className={
              kindFilter === k
                ? "rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
                : "rounded-lg bg-black/5 px-3 py-1.5 text-sm font-medium"
            }
          >
            {k === "all" ? "全部" : k === "service" ? "产品服务" : "AI产品"}
          </button>
        ))}
      </div>

      {/* 一级分类 */}
      <div className="mt-3 flex flex-wrap gap-2">
        {l1s.map((c) => (
          <button
            key={c.id}
            onClick={() => {
              setSelL1(c.id);
              setSelL2(null);
            }}
            className={
              selL1 === c.id
                ? "rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
                : "rounded-lg bg-black/5 px-3 py-1.5 text-sm font-medium"
            }
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* 二级分类 */}
      {l2s.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            onClick={() => setSelL2(null)}
            className={
              selL2 === null
                ? "rounded-lg border border-primary px-2.5 py-1 text-xs font-medium text-primary"
                : "rounded-lg bg-black/5 px-2.5 py-1 text-xs font-medium"
            }
          >
            全部
          </button>
          {l2s.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelL2(c.id)}
              className={
                selL2 === c.id
                  ? "rounded-lg border border-primary px-2.5 py-1 text-xs font-medium text-primary"
                  : "rounded-lg bg-black/5 px-2.5 py-1 text-xs font-medium"
              }
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      <p className="mt-4 text-sm text-muted">共 {shown.length} 项</p>

      {/* 产品列表 */}
      <div className="mt-3 space-y-3">
        {shown.length === 0 && <div className="glass rounded-2xl p-8 text-center text-sm text-muted">该分类下暂无产品</div>}
        {shown.map((p) => {
          const relEnts = productEntities.filter((r) => r.product_id === p.id).map((r) => entName[r.entity_id]).filter(Boolean);
          return (
            <div key={p.id} className="glass rounded-2xl p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{p.name}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                    {p.kind === "ai" && <span className="rounded bg-primary/15 px-1.5 py-0.5 font-medium text-primary">AI</span>}
                    <span className="rounded bg-black/5 px-1.5 py-0.5">{p.hw_type}</span>
                    <span className="rounded bg-black/5 px-1.5 py-0.5">{p.is_consumable ? "耗材" : "非耗材"}</span>
                    <span className="font-medium text-amber-600">{priceFmt(p)}</span>
                  </p>
                  {relEnts.length > 0 && (
                    <p className="mt-1 flex flex-wrap gap-1">
                      {relEnts.map((n) => (
                        <span key={n} className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                          {n}
                        </span>
                      ))}
                    </p>
                  )}
                </div>
                <span className={"shrink-0 rounded-full px-2.5 py-1 text-xs font-medium " + (p.status === "listed" ? "bg-primary/10 text-primary" : "bg-black/5 text-muted")}>
                  {CATALOG_STATUS[p.status] ?? p.status}
                </span>
                <button
                  onClick={() => toggle(p)}
                  disabled={busyId === p.id}
                  className={
                    "shrink-0 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50 " +
                    (p.status === "listed"
                      ? "bg-black/5"
                      : "bg-primary text-primary-foreground")
                  }
                >
                  {busyId === p.id ? "处理中…" : p.status === "listed" ? "下架" : "上架"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- 商品审核 ---------------- */
function TabProducts() {
  const [filter, setFilter] = useState<string>("pending");
  const [rows, setRows] = useState<Array<Record<string, any>>>([]);
  const [msg, setMsg] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [priceMap, setPriceMap] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const res = await adminListProducts(filter);
    if ("error" in res) setMsg(res.error);
    else setRows(res.data);
  }, [filter]);
  useEffect(() => {
    load();
  }, [load]);

  async function act(id: string, status: "listed" | "rejected" | "pending") {
    setBusyId(id);
    setMsg("");
    const price = Number(priceMap[id]);
    const res = await adminReviewProduct(id, status, status === "listed" && !Number.isNaN(price) && price > 0 ? price : undefined);
    setBusyId(null);
    if ("error" in res) setMsg(res.error);
    else {
      setPriceMap((m) => ({ ...m, [id]: "" }));
      await load();
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {["pending", "listed", "rejected"].map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={filter === s ? "rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground" : "rounded-lg bg-black/5 px-3 py-1.5 text-sm font-medium"}>
            {PROD_STATUS[s]}
          </button>
        ))}
      </div>
      {msg && <p className="mt-2 text-sm text-danger">{msg}</p>}
      <div className="mt-4 space-y-3">
        {rows.length === 0 && <div className="glass rounded-2xl p-8 text-center text-sm text-muted">暂无商品</div>}
        {rows.map((p) => (
          <div key={p.id} className="glass rounded-2xl p-4">
            <div className="flex items-start gap-3">
              {p.images?.[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.images[0]} alt={p.title} className="h-14 w-14 shrink-0 rounded-xl object-cover" />
              ) : (
                <div className="h-14 w-14 shrink-0 rounded-xl bg-black/5" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{p.title}</p>
                <p className="mt-0.5 text-xs text-muted">
                  {p.zhuli_suppliers?.name ?? "档口未知"} · 供应价 ¥{Number(p.supply_price).toLocaleString()} · 平台价 ¥{(p.platform_price ?? "未设").toLocaleString()}
                </p>
                <p className="mt-0.5 text-xs text-muted">{p.category || "—"} · 库存 {p.stock} · {p.weight_grams ? `${p.weight_grams}g` : "未知克重"}</p>
              </div>
            </div>
            {filter === "pending" && (
              <div className="mt-3 flex items-center gap-2 border-t border-black/5 pt-3">
                <input
                  value={priceMap[p.id] ?? ""}
                  onChange={(e) => setPriceMap((m) => ({ ...m, [p.id]: e.target.value }))}
                  placeholder="平台售价（元）"
                  inputMode="decimal"
                  className="min-w-0 flex-1 rounded-lg bg-black/5 px-3 py-2 text-sm outline-none"
                />
                <button onClick={() => act(p.id, "rejected")} disabled={busyId === p.id} className="rounded-lg bg-black/5 px-4 py-2 text-sm font-medium disabled:opacity-50">
                  驳回
                </button>
                <button onClick={() => act(p.id, "listed")} disabled={busyId === p.id} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
                  {busyId === p.id ? "处理中…" : "上架"}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- 需求（找货/代购/质检/跑腿） ---------------- */
function TabTasks() {
  const [rows, setRows] = useState<Array<Record<string, any>>>([]);
  const [msg, setMsg] = useState("");
  const load = useCallback(async () => {
    const res = await adminListTasks();
    if ("error" in res) setMsg(res.error);
    else setRows(res.data);
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  return (
    <div>
      <p className="text-sm text-muted">用户提交的需求（共 {rows.length} 条）</p>
      {msg && <p className="mt-2 text-sm text-danger">{msg}</p>}
      <div className="mt-4 space-y-3">
        {rows.length === 0 && <div className="glass rounded-2xl p-8 text-center text-sm text-muted">暂无需求</div>}
        {rows.map((t) => (
          <div key={t.id} className="glass rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{TASK_TYPE[t.type] ?? t.type}</span>
              <span className="rounded-full bg-black/5 px-2 py-0.5 text-xs">{TASK_STATUS[t.status] ?? t.status}</span>
            </div>
            <p className="mt-2 text-sm">{t.description || "（无描述）"}</p>
            {(t.budget_min != null || t.commission != null) && (
              <p className="mt-1 text-xs text-muted">
                {t.budget_min != null ? `预算 ¥${t.budget_min}~${t.budget_max ?? "?"}` : ""}
                {t.commission != null ? ` · 佣金 ¥${t.commission}` : ""}
              </p>
            )}
            <p className="mt-2 text-xs text-muted">
              发布人：{t.zhuli_users?.nickname || t.zhuli_users?.phone || "—"} · {new Date(t.created_at).toLocaleString("zh-CN")}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- 站点外观 ---------------- */
function TabSite() {
  const [url, setUrl] = useState("");
  const [behaviorProducts, setBehaviorProducts] = useState(false);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const bgFileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const res = await adminListSiteConfig();
    if ("error" in res) {
      setMsg(res.error);
      return;
    }
    const items = (res.items ?? []) as Array<{ key: string; value: any }>;
    const bg = items.find((i) => i.key === "home_bg");
    const rec = items.find((i) => i.key === "rec");
    setUrl(bg?.value?.url ?? "");
    setBehaviorProducts(!!rec?.value?.behavior_products);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function onBgFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setMsg("");
    try {
      // 首页 Hero 为 4:5 竖版：不符比例统一居中裁切，超尺寸自动压缩为 WebP
      const fit = await cropToRatio(file, 4 / 5, 1000);
      const publicUrl = await uploadToCos(fit, "misc");
      const res = await adminSetSiteConfig("home_bg", publicUrl);
      if (res.error) {
        setMsg(res.error);
        return;
      }
      setUrl(publicUrl);
      setMsg("已保存，刷新首页即可看到新背景");
    } catch (err) {
      setMsg((err as Error).message || "上传失败");
    } finally {
      setBusy(false);
    }
  }

  async function restoreDefault() {
    setBusy(true);
    setMsg("");
    const res = await adminSetSiteConfig("home_bg", "");
    setBusy(false);
    if (res.error) setMsg(res.error);
    else {
      setUrl("");
      setMsg("已恢复默认暖色渐变");
    }
  }

  async function saveRec() {
    setBusy(true);
    setMsg("");
    const res = await adminSetRecConfig({ behavior_products: behaviorProducts });
    setBusy(false);
    if (res.error) setMsg(res.error);
    else {
      setMsg("推荐设置已保存");
      await load();
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted">首页背景图（仅首页 Hero 使用，其他页面无背景图）</p>
        {msg && <p className={"mt-2 text-sm " + (msg.startsWith("已") ? "text-primary" : "text-danger")}>{msg}</p>}
        <div className="glass mt-4 max-w-md space-y-3 rounded-2xl p-4">
          <p className="text-xs leading-relaxed text-muted">
            建议尺寸 <span className="font-medium text-primary">800×1000</span>（竖版 4:5，与首页 Hero 一致）。
            上传后会自动按 4:5 <span className="font-medium">居中裁切</span>，比例不符时裁掉多余部分，超尺寸自动压缩为 WebP。
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => bgFileRef.current?.click()}
              disabled={busy}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {busy ? "上传中…" : "上传背景图"}
            </button>
            <button
              onClick={restoreDefault}
              disabled={busy}
              className="rounded-lg bg-black/5 px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              恢复默认
            </button>
            <input ref={bgFileRef} type="file" accept="image/*" className="hidden" onChange={onBgFile} />
          </div>
          {url && (
            <div className="overflow-hidden rounded-xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="背景预览" className="aspect-[4/5] w-full bg-[#efe4cc] object-cover" />
            </div>
          )}
        </div>
      </div>

      <div>
        <p className="text-sm text-muted">推荐设置</p>
        <div className="glass mt-4 max-w-md space-y-3 rounded-2xl p-4">
          <label className="flex items-center justify-between">
            <span className="text-sm">
              商品列表 /products 按用户行为权重排序
              <span className="block text-xs text-muted">开启后，登录用户的首页/商品列表会把自己常看类别的商品排前面；关闭则按上架时间</span>
            </span>
            <input
              type="checkbox"
              checked={behaviorProducts}
              onChange={(e) => setBehaviorProducts(e.target.checked)}
              className="h-5 w-5"
            />
          </label>
          <button
            onClick={saveRec}
            disabled={busy}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {busy ? "保存中…" : "保存推荐设置"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- 供应商入驻审批 ---------------- */
function TabSuppliers() {
  const [rows, setRows] = useState<Array<Record<string, any>>>([]);
  const [msg, setMsg] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const load = useCallback(async () => {
    const res = await adminListSupplierApplications();
    if ("error" in res) setMsg(res.error);
    else setRows(res.data);
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  async function act(id: string, status: "active" | "rejected") {
    setBusyId(id);
    const res = await adminReviewSupplier(id, status);
    setBusyId(null);
    if ("error" in res) setMsg(res.error);
    else await load();
  }
  return (
    <div>
      <p className="text-sm text-muted">待审批的供应商入驻申请（{rows.length} 条）</p>
      {msg && <p className="mt-2 text-sm text-danger">{msg}</p>}
      <div className="mt-4 space-y-3">
        {rows.length === 0 && <div className="glass rounded-2xl p-8 text-center text-sm text-muted">暂无待审批申请</div>}
        {rows.map((s) => (
          <div key={s.id} className="glass rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">{s.name}</span>
              <span className="text-xs text-muted">{s.status === "pending" ? "待审核" : "已驳回"}</span>
            </div>
            <p className="mt-1 text-xs text-muted">
              联系人 {s.contact_name || "—"} · {s.contact_phone || "—"} · 申请账号 {s.zhuli_users?.nickname || s.zhuli_users?.phone || "—"}
            </p>
            <p className="mt-1 text-xs text-muted">
              主营 {(s.category ?? []).join("、") || "—"} · {s.stall_address || "—"}
            </p>
            <div className="mt-3 flex gap-2">
              <button onClick={() => act(s.id, "rejected")} disabled={busyId === s.id} className="rounded-lg bg-black/5 px-4 py-2 text-sm font-medium disabled:opacity-50">
                驳回
              </button>
              <button onClick={() => act(s.id, "active")} disabled={busyId === s.id} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
                {busyId === s.id ? "处理中…" : "通过入驻"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- 以图搜图（向量库建库任务） ---------------- */
type ImgProgress = { total: number; done: number; pending: number; remaining: number };
type ImgTask = { status?: string; model?: string | null; error?: string | null };

const EMBED_BATCH_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/zhuli_image_embed_batch`;

const IMG_ACTION_LABEL: Record<string, string> = {
  idle: "未开始",
  running: "处理中",
  paused: "已暂停",
  done: "已完成",
  failed: "失败",
};

function TabImageSearch() {
  const token = useAuthStore((s) => s.session?.access_token);
  const [prog, setProg] = useState<ImgProgress>({ total: 0, done: 0, pending: 0, remaining: 0 });
  const [task, setTask] = useState<ImgTask | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const call = useCallback(
    async (action: string) => {
      if (!token) {
        setMsg("未获取到登录凭证，请重新登录后再试");
        return null;
      }
      setBusy(true);
      setMsg("");
      try {
        const res = await fetch(EMBED_BATCH_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ action, source: "jewelry", batch_size: 15 }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setMsg(data?.error || `请求失败 HTTP ${res.status}`);
          return null;
        }
        setProg({
          total: Number(data?.total ?? 0),
          done: Number(data?.done ?? 0),
          pending: Number(data?.pending ?? 0),
          remaining: Number(data?.remaining ?? 0),
        });
        if (data?.task) setTask(data.task as ImgTask);
        return data;
      } catch (e) {
        setMsg((e as Error).message || "网络错误");
        return null;
      } finally {
        setBusy(false);
      }
    },
    [token]
  );

  const refresh = useCallback(() => call("status"), [call]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const pct = prog.total > 0 ? Math.round((prog.done / prog.total) * 100) : 0;
  const running = task?.status === "running";

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm text-muted">商品图向量库 · 来源：珠宝成品</p>
        <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
          {IMG_ACTION_LABEL[task?.status ?? "idle"] ?? task?.status}
        </span>
      </div>

      {/* 配置状态 */}
      <div className="glass mt-4 max-w-md rounded-2xl p-4">
        <div className="space-y-1.5 text-sm">
          <p className="flex items-center justify-between">
            <span className="text-muted">百炼 Embedding Key</span>
            <span className="font-medium text-primary">已配置</span>
          </p>
          <p className="flex items-center justify-between">
            <span className="text-muted">Embedding 模型</span>
            <span className="font-mono text-xs">{task?.model || "tongyi-embedding-vision-flash"}</span>
          </p>
        </div>
      </div>

      {/* 进度 */}
      <div className="glass mt-4 max-w-md rounded-2xl p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">
            {pct}%（{prog.done.toLocaleString()} / {prog.total.toLocaleString()} 张）
          </span>
          <span className="text-xs text-muted">剩余 {prog.remaining.toLocaleString()} · 待处理 {prog.pending.toLocaleString()}</span>
        </div>
        <div className="mt-2.5 h-2.5 w-full overflow-hidden rounded-full bg-black/5">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#c9a227] to-[#e6c15a] transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {msg && <p className="mt-3 text-sm text-danger">{msg}</p>}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={() => call("start")}
          disabled={busy}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {busy ? "处理中…" : "启动 / 重新登记"}
        </button>
        <button
          onClick={() => call("continue")}
          disabled={busy}
          className="rounded-lg bg-black/5 px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          继续处理一批
        </button>
        <button
          onClick={() => call("pause")}
          disabled={busy || !running}
          className="rounded-lg bg-black/5 px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          暂停
        </button>
        <button
          onClick={refresh}
          disabled={busy}
          className="rounded-lg bg-black/5 px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          刷新
        </button>
      </div>

      <p className="mt-4 max-w-md text-xs leading-relaxed text-muted">
        流程：点「启动 / 重新登记」把每件商品的 ≤3 张图登记入库并开始；再不断点「继续处理一批」逐批调百炼生成向量（每批 15 张）。
        处理中可随时「暂停」断点保存，之后点「继续处理一批」即可从断点续跑。「启动 / 重新登记」会保留已完成的图。
      </p>
    </div>
  );
}