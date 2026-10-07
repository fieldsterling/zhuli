// 全站服务目录（首页两行 8 项 + 全部服务页共用）
export type ServiceItem = { slug: string; title: string; desc: string; color: string };

export const SERVICES: ServiceItem[] = [
  { slug: "gold-price", title: "金价", desc: "实时金价查询", color: "#c9a227" },
  { slug: "find", title: "找货", desc: "水贝源头找货", color: "#b08d4a" },
  { slug: "proxy", title: "代购", desc: "一手代购代发", color: "#8a5a33" },
  { slug: "errand", title: "跑腿", desc: "同城极速跑腿", color: "#3a6ea5" },
  { slug: "design", title: "设计", desc: "原创珠宝设计", color: "#a05ba6" },
  { slug: "make", title: "打金", desc: "来料打金定制", color: "#d0763f" },
  { slug: "recycle", title: "回收", desc: "旧金闲置回收", color: "#7a8b62" },
  { slug: "qc", title: "质检", desc: "国检权威检测", color: "#6b8e4e" },
];