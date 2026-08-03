"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { uploadPublicMedia } from "@/lib/supabase/upload";
import { addNews, deleteNews } from "@/lib/admin/actions";

export type AdminNews = {
  id: string;
  image_url: string | null;
  caption: string;
  created_at: string;
};

export default function NewsManager({ news }: { news: AdminNews[] }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [fileKey, setFileKey] = useState(0);

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!caption.trim()) {
      setErr("اكتب نص الخبر.");
      return;
    }
    setBusy(true);
    try {
      let imageUrl: string | null = null;
      if (file) imageUrl = await uploadPublicMedia("news", file);
      const res = await addNews(caption, imageUrl);
      if (res.error) setErr(res.error);
      else {
        setCaption("");
        setFile(null);
        setFileKey((k) => k + 1);
        router.refresh();
      }
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "صار خطأ.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    await deleteNews(id);
    router.refresh();
  }

  return (
    <section className="space-y-4">
      <form onSubmit={onAdd} className="space-y-3 rounded-2xl border border-border bg-white p-4">
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          rows={3}
          placeholder="نص الخبر…"
          className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-teal"
        />
        <div className="space-y-1">
          <label className="text-sm text-ink-soft">صورة (اختيارية)</label>
          <input
            key={fileKey}
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="w-full text-sm text-ink-soft file:mr-3 file:rounded-lg file:border-0 file:bg-teal-light file:px-3 file:py-1.5 file:text-teal-dark"
          />
          <p className="text-xs text-ink-soft">
            الأبعاد الموصى بها: ١٢٠٠×٨٠٠ بكسل تقريباً. أي حجم يُضغط تلقائياً.
          </p>
        </div>
        {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
        <button
          type="submit"
          disabled={busy}
          className="rounded-xl bg-teal px-5 py-2 text-sm font-medium text-white hover:bg-teal-dark disabled:opacity-60"
        >
          {busy ? "…جارٍ النشر" : "نشر خبر"}
        </button>
      </form>

      <div className="space-y-3">
        {news.map((n) => (
          <div key={n.id} className="flex gap-3 rounded-2xl border border-border bg-white p-3 shadow-sm">
            {n.image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={n.image_url} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm text-ink">{n.caption}</p>
              <p className="mt-1 text-xs text-ink-soft">
                {new Date(n.created_at).toLocaleDateString("ar")}
              </p>
            </div>
            <button
              onClick={() => remove(n.id)}
              className="h-fit rounded-lg border border-red-300 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
            >
              حذف
            </button>
          </div>
        ))}
        {news.length === 0 && <p className="text-sm text-ink-soft">لا توجد أخبار بعد.</p>}
      </div>
    </section>
  );
}
