import { SERVICES } from "@/lib/services";

/** 首访分流：「我需要助理服务」分支里，可选的常用服务（复用首页 8 项服务） */
export const CUSTOMER_SERVICES = SERVICES.map((s) => ({ slug: s.slug, title: s.title, desc: s.desc }));

/** 「我还想…」的其它意向 */
export const OTHER_INTENTS: { key: string; label: string; desc: string }[] = [
  { key: "promoter", label: "我想成为推广者", desc: "分享链接赚佣金" },
  { key: "sidejob", label: "我可以兼职编程 / AI 设计 / 推销 / 直播", desc: "用技能接单" },
  { key: "talent", label: "我想进入人才库，找珠宝行业工作", desc: "投递简历" },
];

/** 「我也能提供服务/产品」分支：产业链角色 */
export const INDUSTRY_ROLES: { key: string; label: string }[] = [
  { key: "factory", label: "工厂" },
  { key: "wax", label: "蜡版" },
  { key: "design", label: "设计" },
  { key: "showroom", label: "展厅" },
  { key: "stall", label: "档口" },
  { key: "finance", label: "金融" },
  { key: "live", label: "直播" },
  { key: "testing", label: "检测" },
  { key: "education", label: "教育" },
  { key: "wholesale2", label: "二批" },
  { key: "retail", label: "零售" },
  { key: "recycle", label: "回收" },
  { key: "personal", label: "个人店铺" },
];

/** 角色 key → 主体 code（对应 zhuli_entities.code，供应能力表用 entity_id 关联） */
export const ROLE_TO_ENTITY_CODE: Record<string, string> = {
  factory: "gc",
  wax: "lb",
  design: "sj",
  showroom: "zt",
  stall: "dk",
  finance: "jr",
  live: "zb",
  testing: "jc",
  education: "jy",
  wholesale2: "ep",
  retail: "ls",
  recycle: "hs",
  personal: "gr",
};

/** 本地暂存键：未登录完成分流后，登录时回填 */
export const ENTRY_DRAFT_KEY = "zhuli_entry_draft";