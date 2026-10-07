"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, MapPin, Check } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase";
import { useAuthStore } from "@/store/auth";
import { CHINA_REGIONS } from "@/lib/china-regions";
import type { Database } from "@/types/supabase";

type Address = Database["public"]["Tables"]["zhuli_addresses"]["Row"];

const provinces = Object.keys(CHINA_REGIONS);

const emptyForm = {
  receiver: "",
  phone: "",
  province: "",
  city: "",
  district: "",
  detail: "",
  is_default: false,
};
type FormState = typeof emptyForm;

export function AddressManager() {
  const router = useRouter();
  const supabase = createBrowserClient();
  const user = useAuthStore((s) => s.user);

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Address | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    let active = true;
    supabase
      .from("zhuli_addresses")
      .select("*")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (!active) return;
        setAddresses((data ?? []) as Address[]);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [supabase, user]);

  if (!user) {
    return (
      <div className="flex flex-col items-center pt-6">
        <p className="text-sm text-muted">请先登录</p>
        <button
          onClick={() => router.push("/login")}
          className="mt-4 rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground"
        >
          去登录
        </button>
      </div>
    );
  }

  const uid = user.id;

  function openNew() {
    setEditing(null);
    setForm(emptyForm);
    setErr("");
    setOpen(true);
  }
  function openEdit(a: Address) {
    setEditing(a);
    setForm({
      receiver: a.receiver,
      phone: a.phone,
      province: a.province ?? "",
      city: a.city ?? "",
      district: a.district ?? "",
      detail: a.detail ?? "",
      is_default: a.is_default,
    });
    setErr("");
    setOpen(true);
  }

  const cities = form.province ? Object.keys(CHINA_REGIONS[form.province] ?? {}) : [];
  const districts = form.province && form.city
    ? CHINA_REGIONS[form.province]?.[form.city] ?? []
    : [];

  function setField<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => {
      const next = { ...f, [k]: v };
      // 切换省/市时清空下级
      if (k === "province") next.city = "";
      if (k === "province" || k === "city") next.district = "";
      return next;
    });
  }

  async function save() {
    if (!form.receiver.trim()) return setErr("请填写收货人");
    if (!/^1\d{10}$/.test(form.phone)) return setErr("请填写 11 位手机号");
    if (!form.detail.trim()) return setErr("请填写详细地址");
    setErr("");
    setSaving(true);

    // 设为默认时先清掉其余默认
    if (form.is_default) {
      await supabase
        .from("zhuli_addresses")
        .update({ is_default: false })
        .eq("user_id", uid)
        .neq("id", editing?.id ?? "__none__");
    }

    const payload = {
      user_id: uid,
      receiver: form.receiver.trim(),
      phone: form.phone.trim(),
      province: form.province || null,
      city: form.city || null,
      district: form.district || null,
      detail: form.detail.trim(),
      is_default: form.is_default,
    };

    const { error } = editing
      ? await supabase.from("zhuli_addresses").update(payload).eq("id", editing.id)
      : await supabase.from("zhuli_addresses").insert(payload);

    setSaving(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setOpen(false);
    const { data } = await supabase
      .from("zhuli_addresses")
      .select("*")
      .eq("user_id", uid)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });
    setAddresses((data ?? []) as Address[]);
  }

  async function remove(id: string) {
    if (!window.confirm("确定删除该收货地址？")) return;
    await supabase.from("zhuli_addresses").delete().eq("id", id);
    setAddresses((list) => list.filter((a) => a.id !== id));
  }

  async function setDefault(id: string) {
    await supabase.from("zhuli_addresses").update({ is_default: false }).eq("user_id", uid);
    await supabase.from("zhuli_addresses").update({ is_default: true }).eq("id", id);
    setAddresses((list) =>
      list.map((a) => ({ ...a, is_default: a.id === id }))
    );
  }

  const selectCls =
    "w-full bg-transparent px-3 py-2 text-sm outline-none disabled:text-muted/70";

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">收货地址</h2>
        <button
          onClick={openNew}
          className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
        >
          <Plus className="h-4 w-4" /> 新增地址
        </button>
      </div>

      {loading ? (
        <div className="mt-3 h-24 animate-pulse rounded-2xl bg-black/5" />
      ) : addresses.length === 0 ? (
        <div className="glass mt-3 rounded-2xl p-6 text-center text-sm text-muted">
          还没有收货地址，点击“新增地址”添加
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          {addresses.map((a) => (
            <div key={a.id} className="glass rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-medium">
                  <MapPin className="h-4 w-4 text-primary" />
                  {a.receiver}
                  <span className="text-xs font-normal text-muted">{a.phone}</span>
                </span>
                <div className="flex items-center gap-2">
                  {a.is_default ? (
                    <span className="flex items-center gap-0.5 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary">
                      <Check className="h-3 w-3" /> 默认
                    </span>
                  ) : (
                    <button
                      onClick={() => setDefault(a.id)}
                      className="text-xs text-muted hover:text-primary"
                    >
                      设为默认
                    </button>
                  )}
                  <button onClick={() => openEdit(a)} aria-label="编辑">
                    <Pencil className="h-4 w-4 text-muted" />
                  </button>
                  <button onClick={() => remove(a.id)} aria-label="删除">
                    <Trash2 className="h-4 w-4 text-muted" />
                  </button>
                </div>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                <span className="text-foreground">
                  {a.province}{a.city}{a.district}
                </span>{" "}
                {a.detail}
              </p>
            </div>
          ))}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
          <div className="glass w-full max-w-md rounded-2xl p-5 sm:rounded-3xl">
            <h3 className="text-base font-semibold">{editing ? "编辑地址" : "新增地址"}</h3>

            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input
                  className="glass rounded-xl px-3 py-2.5 text-sm outline-none"
                  placeholder="收货人"
                  value={form.receiver}
                  onChange={(e) => setField("receiver", e.target.value)}
                />
                <input
                  type="tel"
                  className="glass rounded-xl px-3 py-2.5 text-sm outline-none"
                  placeholder="手机号"
                  value={form.phone}
                  onChange={(e) => setField("phone", e.target.value)}
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <select
                  className={`glass rounded-xl py-2.5 outline-none ${selectCls}`}
                  value={form.province}
                  onChange={(e) => setField("province", e.target.value)}
                >
                  <option value="">省</option>
                  {provinces.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                <select
                  className={`glass rounded-xl py-2.5 outline-none ${selectCls}`}
                  value={form.city}
                  disabled={!form.province}
                  onChange={(e) => setField("city", e.target.value)}
                >
                  <option value="">市</option>
                  {cities.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <select
                  className={`glass rounded-xl py-2.5 outline-none ${selectCls}`}
                  value={form.district}
                  disabled={!form.city}
                  onChange={(e) => setField("district", e.target.value)}
                >
                  <option value="">区/县</option>
                  {districts.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <input
                className="glass w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                placeholder="详细地址（街道 / 门牌号）"
                value={form.detail}
                onChange={(e) => setField("detail", e.target.value)}
              />

              <label className="flex items-center gap-2 text-sm text-muted">
                <input
                  type="checkbox"
                  checked={form.is_default}
                  onChange={(e) => setField("is_default", e.target.checked)}
                  className="accent-primary"
                />
                设为默认地址
              </label>
            </div>

            {err && <p className="mt-3 text-sm text-danger">{err}</p>}

            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 rounded-xl bg-black/5 py-3 text-sm font-medium"
              >
                取消
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="flex-1 rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground disabled:opacity-50"
              >
                {saving ? "保存中…" : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}