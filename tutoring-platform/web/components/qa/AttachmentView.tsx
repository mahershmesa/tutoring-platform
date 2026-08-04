"use client";

// عرض مرفق (صورة مصغّرة أو رابط تنزيل) عبر رابط موقّت.
export default function AttachmentView({
  url,
  mime,
  name,
}: {
  url: string;
  mime: string | null;
  name: string | null;
}) {
  const isImage = mime?.startsWith("image/");
  if (isImage) {
    return (
      <a href={url} target="_blank" rel="noreferrer noopener">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={name ?? "مرفق"}
          className="max-h-40 rounded-lg border border-border object-cover"
        />
      </a>
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer noopener"
      className="inline-flex items-center gap-1.5 rounded-lg bg-surface px-2 py-1 text-xs text-teal-dark underline"
    >
      📎 {name ?? "ملف مرفق"}
    </a>
  );
}
