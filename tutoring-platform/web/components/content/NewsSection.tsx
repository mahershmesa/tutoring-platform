export type PublicNews = {
  id: string;
  image_url: string | null;
  caption: string;
  created_at: string;
};

export default function NewsSection({ news }: { news: PublicNews[] }) {
  if (news.length === 0) return null;

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-bold text-ink">الأخبار</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {news.map((n) => (
          <article
            key={n.id}
            className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm"
          >
            {n.image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={n.image_url}
                alt=""
                className="h-36 w-full object-cover"
              />
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
