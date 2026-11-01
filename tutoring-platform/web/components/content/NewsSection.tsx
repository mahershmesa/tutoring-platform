import Image from "next/image";

export type PublicNews = {
  id: string;
  image_url: string | null;
  caption: string;
  created_at: string;
};

export default function NewsSection({ news }: { news: PublicNews[] }) {
  if (news.length === 0) return null;

  return (
    <section id="news-section" className="scroll-mt-4 space-y-3">
      <h2 className="text-lg font-bold text-ink">الأخبار</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {news.map((n) => (
          <article
            key={n.id}
            className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
          >
            {n.image_url && (
              <div className="relative h-36 w-full">
                <Image
                  src={n.image_url}
                  alt=""
                  fill
                  loading="lazy"
                  sizes="(max-width: 640px) 100vw, 370px"
                  className="object-cover"
                />
              </div>
            )}
            <div className="p-3">
              <p className="text-sm text-ink">{n.caption}</p>
              <p className="mt-1 text-xs text-ink-soft">
                {new Date(n.created_at).toLocaleDateString("ar")}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
