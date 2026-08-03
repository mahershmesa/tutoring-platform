"use client";

import { safeExternalUrl } from "@/lib/safe-url";

export type MessageVM = {
  id: string;
  fromMe: boolean;
  body: string;
  attachmentUrl: string | null;
  attachmentMime: string | null;
  attachmentName: string | null;
};

// يحوّل روابط http/https داخل النص إلى روابط قابلة للضغط (بعد تعقيمها)
function renderBody(body: string) {
  const parts = body.split(/(https?:\/\/[^\s]+)/g);
  return parts.map((part, i) => {
    const safe = /^https?:\/\//i.test(part) ? safeExternalUrl(part) : null;
    if (safe) {
      return (
        <a
          key={i}
          href={safe}
          target="_blank"
          rel="noreferrer noopener"
          className="underline"
        >
          {part}
        </a>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export default function MessageBubble({ m }: { m: MessageVM }) {
  const isImage = m.attachmentMime?.startsWith("image/");
  return (
    <div
      className={
        "max-w-[85%] space-y-1.5 rounded-lg px-3 py-1.5 text-sm " +
        (m.fromMe ? "ml-auto bg-teal-light text-ink" : "bg-white text-ink shadow-sm")
      }
    >
      {m.body && <p className="whitespace-pre-wrap break-words">{renderBody(m.body)}</p>}

      {m.attachmentUrl &&
        (isImage ? (
          <a href={m.attachmentUrl} target="_blank" rel="noreferrer noopener">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={m.attachmentUrl}
              alt={m.attachmentName ?? "مرفق"}
              className="max-h-40 rounded-lg border border-border object-cover"
            />
          </a>
        ) : (
          <a
            href={m.attachmentUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="flex items-center gap-1.5 rounded-lg bg-white/70 px-2 py-1 text-teal-dark underline"
          >
            📎 {m.attachmentName ?? "ملف مرفق"}
          </a>
        ))}
    </div>
  );
}
