"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export type PublicAd = {
  id: string;
  image_url: string;
  caption: string | null;
  contact_info: string | null;
};

export default function AdsCarousel({ ads }: { ads: PublicAd[] }) {
  const [i, setI] = useState(0);
  const [openAd, setOpenAd] = useState<PublicAd | null>(null);

  useEffect(() => {
    if (ads.length <= 1) return;
    const timer = setInterval(
      () => setI((p) => (p + 1) % ads.length),
      5000,
    );
    return () => clearInterval(timer);
  }, [ads.length]);

  if (ads.length === 0) return null;
  const ad = ads[Math.min(i, ads.length - 1)];
  const clickable = Boolean(ad.contact_info);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
      <div className="relative h-40 w-full sm:h-48">
        {/* شرائح مكدّسة محسّنة عبر next/image (تصغير تلقائي على CDN).
            الأولى priority (عنصر LCP)، والباقي يُحمّل بتكاسل — تبديل سلس بالتلاشي. */}
        {ads.map((a, idx) => (
          <Image
            key={a.id}
            src={a.image_url}
            alt={a.caption ?? "إعلان"}
            fill
            priority={idx === 0}
            sizes="(max-width: 768px) 100vw, 768px"
            className={
              "object-cover transition-opacity duration-500 " +
              (idx === i ? "opacity-100" : "opacity-0")
            }
          />
        ))}
        <button
          type="button"
          onClick={() => clickable && setOpenAd(ad)}
          className={
            "absolute inset-0 block w-full " +
            (clickable ? "cursor-pointer" : "cursor-default")
          }
          aria-label={clickable ? "عرض معلومات التواصل" : undefined}
        />
        {ads.length > 1 && (
          <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center gap-1.5">
            {ads.map((a, idx) => (
              <button
                key={a.id}
                onClick={() => setI(idx)}
                aria-label={`إعلان ${idx + 1}`}
                className={
                  "pointer-events-auto h-1.5 rounded-full transition-all " +
                  (idx === i ? "w-4 bg-white" : "w-1.5 bg-white/60")
                }
              />
            ))}
          </div>
        )}
      </div>
      {ad.caption && <p className="px-4 py-2 text-sm text-ink">{ad.caption}</p>}

      {openAd && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 px-4"
          onClick={() => setOpenAd(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-1 text-base font-bold text-ink">معلومات التواصل</h3>
            {openAd.caption && (
              <p className="mb-2 text-sm text-ink-soft">{openAd.caption}</p>
            )}
            <p className="rounded-xl bg-teal-light px-3 py-3 text-center text-lg font-medium text-teal-dark" dir="ltr">
              {openAd.contact_info}
            </p>
            <button
              onClick={() => setOpenAd(null)}
              className="mt-4 w-full rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-ink-soft hover:border-teal"
            >
              تخطي / إغلاق
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
