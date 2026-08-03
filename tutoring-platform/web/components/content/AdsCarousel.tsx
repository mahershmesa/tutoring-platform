"use client";

import { useEffect, useState } from "react";

export type PublicAd = {
  id: string;
  image_url: string;
  caption: string | null;
};

export default function AdsCarousel({ ads }: { ads: PublicAd[] }) {
  const [i, setI] = useState(0);

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

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
      <div className="relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={ad.image_url}
          alt={ad.caption ?? "إعلان"}
          className="h-40 w-full object-cover sm:h-48"
        />
        {ads.length > 1 && (
          <div className="absolute inset-x-0 bottom-2 flex justify-center gap-1.5">
            {ads.map((a, idx) => (
              <button
                key={a.id}
                onClick={() => setI(idx)}
                aria-label={`إعلان ${idx + 1}`}
                className={
                  "h-1.5 rounded-full transition-all " +
                  (idx === i ? "w-4 bg-white" : "w-1.5 bg-white/60")
                }
              />
            ))}
          </div>
        )}
      </div>
      {ad.caption && (
        <p className="px-4 py-2 text-sm text-ink">{ad.caption}</p>
      )}
    </div>
  );
}
