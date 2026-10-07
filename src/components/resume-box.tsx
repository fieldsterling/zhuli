"use client";

import { useEffect, useState } from "react";
import { uploadToCos } from "@/lib/upload";
import { saveResume, listMyResumes, deleteResume } from "@/app/actions/myself-answer";

type Resume = { id: string; file_name: string; file_url: string; file_size: number | null; created_at: string };

/** 人才库简历管理：上传 doc/pdf 到 COS zhuli/doc/ 后登记 */
export function ResumeBox() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    void reload();
  }, []);

  async function reload() {
    const res = await listMyResumes();
    setResumes((res.resumes ?? []) as Resume[]);
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setMsg("");
    const okType = /\.(doc|docx|pdf)$/i.test(file.name);
    if (!okType) {
      setMsg("仅支持 .doc / .docx / .pdf 文件");
      e.target.value = "";
      return;
    }
    setBusy(true);
    try {
      const url = await uploadToCos(file, "doc");
      const res = await saveResume({ file_name: file.name, file_url: url, file_size: file.size });
      if (!res.ok) setMsg(res.error);
      else {
        setMsg("已上传简历");
        await reload();
      }
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "上传失败");
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  }

  async function onDelete(id: string) {
    const res = await deleteResume(id);
    if (!res.ok) setMsg(res.error);
    else await reload();
  }

  return (
    <div className="glass mt-4 rounded-2xl p-5">
      <h3 className="text-base font-semibold">我的简历（人才库）</h3>
      <p className="mt-0.5 text-xs text-muted">投递珠宝行业工作机会用，支持 .doc / .docx / .pdf</p>

      <label className="mt-3 inline-flex cursor-pointer items-center rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50">
        {busy ? "上传中…" : "上传简历"}
        <input type="file" accept=".doc,.docx,.pdf" className="hidden" onChange={onFile} disabled={busy} />
      </label>

      {msg && <p className="mt-2 text-sm text-muted">{msg}</p>}

      {resumes.length > 0 && (
        <ul className="mt-3 divide-y divide-black/5">
          {resumes.map((r) => (
            <li key={r.id} className="flex items-center justify-between py-2">
              <a href={r.file_url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-sm text-gold">
                {r.file_name}
              </a>
              <button onClick={() => onDelete(r.id)} className="ml-3 text-xs text-muted">
                删除
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}