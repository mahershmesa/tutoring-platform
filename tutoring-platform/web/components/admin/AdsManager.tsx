"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { uploadPublicMedia } from "@/lib/supabase/upload";
import { addAd, setAdActive, deleteAd } from "@/lib/admin/actions";

export type AdminAd = {
  id: string;
  image_url: string;
  caption: string | null;
  sort_order: number;
  active: boolean;
};

export default function AdsManager({ ads }: { ads: AdminAd[] }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [fileKey, setFileKey] = useState(0); // لإعادة تعيين حقل الملف بعد الإضافة

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!file) {
      setErr("اختر صورة الإعلان.");
      return;
    }
    setBusy(true);
    try {
      const imageUrl = await uploadPublicMedia("ad", file);
      const res = await addAd(imageUrl, caption, Number(sortOrder));
      if (res.error) setErr(res.error);
      else {
        setFile(null);
        setCaption("");
        setSortOrder("0");
        setFileKey((k) => k + 1);
        router.refresh();
      }
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "صار خطأ.");
    } finally {
      setBusy(false);
    }
  }

  async function toggle(id: string, active: boolean) {
    await setAdActive(id, active);
    router.refresh();
  }
  async function remove(id: string) {
    await deleteAd(id);
    router.refresh();
  }

  return (
    <section className="space-y-4">
      <form onSubmit={onAdd} className="space-y-3 rounded-2xl border border-border bg-white p-4">
        <div className="space-y-1">
          <label className="text-sm text-ink-soft">صورة الإعلان</label>
          <input
            key={fileKey}
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="w-full text-sm text-ink-soft file:mr-3 file:rounded-lg file:border-0 file:bg-teal-light file:px-3 file:py-1.5 file:text-teal-dark"
          />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="تعليق (اختياري)"
            className="col-span-2 rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-teal"
          />
          <input
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            type="number"
            placeholder="الترتيب"
            title="الترتيب (الأصغر يظهر أولاً)"
            className="rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-teal"
          />
        </div>
        {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
        <button
          type="submit"
          disabled={busy}
          className="rounded-xl bg-teal px-5 py-2 text-sm font-medium text-white hover:bg-teal-dark disabled:opacity-60"
        >
          {busy ? "…جارٍ الرفع" : "إضافة إعلان"}
        </button>
      </form>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {ads.map((ad) => (
          <div key={ad.id} className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ad.image_url} alt={ad.caption ?? ""} className="h-32 w-full object-cover" />
            <div className="space-y-2 p-3">
              <p className="text-sm text-ink">{ad.caption || "—"}</p>
              <p className="text-xs text-ink-soft">الترتيب: {ad.sort_order}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => toggle(ad.id, !ad.active)}
                  className={
                    "flex-1 rounded-lg px-2 py-1 text-xs font-medium " +
                    (ad.active
                      ? "border border-border text-ink-soft hover:border-teal"
                      : "bg-teal-light text-teal-dark")
                  }
                >
                  {ad.active ? "مفعّل — اضغط للتعطيل" : "معطّل — اضغط للتفعيل"}
                </button>
                <button
                  onClick={() => remove(ad.id)}
                  className="rounded-lg border border-red-300 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                >
                  حذف
                </button>
              </div>
            </div>
          </div>
        ))}
        {ads.length === 0 && (
          <p className="col-span-full text-sm text-ink-soft">لا توجد إعلانات بعد.</p>
        )}
      </div>
    </section>
  );
}
