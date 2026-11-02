"use client";

import { useMemo, useState } from "react";

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}
function TelegramIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden>
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

/** شارة تقديرية حسب عدد من دعاهم المستخدم. */
function tierOf(count: number): { label: string; emoji: string } | null {
  if (count >= 25) return { label: "سفير دليلي", emoji: "👑" };
  if (count >= 10) return { label: "داعم ذهبي", emoji: "🥇" };
  if (count >= 3) return { label: "داعم دليلي", emoji: "🎖️" };
  return null;
}

export default function InviteCard({ code, count }: { code: string; count: number }) {
  const [copied, setCopied] = useState(false);

  const link = useMemo(() => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/?ref=${code}`;
  }, [code]);

  const shareText =
    "انضمّ إلى دليلي 📚 — دليلك لإيجاد مدرّسك الموثّق في العراق حسب محافظتك ومادتك. سجّل عبر رابطي 👇";
  const wa = `https://wa.me/?text=${encodeURIComponent(shareText + "\n" + link)}`;
  const tg = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(shareText)}`;

  const tier = tierOf(count);
  const nextAt = count < 3 ? 3 : count < 10 ? 10 : count < 25 ? 25 : null;

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* الحافظة قد تكون ممنوعة */
    }
  }

  async function shareNative() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "دليلي", text: shareText, url: link });
      } catch {
        /* ألغى المستخدم */
      }
    } else {
      copy();
    }
  }

  return (
    <div className="rounded-2xl border border-teal/30 bg-teal-light/60 p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-base font-bold text-teal-dark">
          🎁 ادعُ أصدقاءك
        </h2>
        <span className="flex items-center gap-1 rounded-full bg-card px-3 py-1 text-sm font-bold text-teal-dark">
          <span className="text-lg">{count}</span>
          <span className="text-xs font-normal text-ink-soft">دعوة</span>
        </span>
      </div>

      <p className="mb-3 text-sm text-ink-soft">
        شارك رابطك الخاص مع زملائك — كل من يسجّل عبره يُحتسب لك، وتكبر شارتك كلما
        دعوت أكثر. 💚
      </p>

      {tier ? (
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-teal/40 bg-card px-3 py-1 text-sm font-bold text-teal-dark">
          <span>{tier.emoji}</span>
          <span>{tier.label}</span>
        </div>
      ) : (
        <p className="mb-3 text-xs text-ink-soft">
          ادعُ {3 - count} {3 - count === 1 ? "شخصاً" : "أشخاص"} لتحصل على شارة
          «داعم دليلي 🎖️».
        </p>
      )}

      {tier && nextAt && (
        <p className="mb-3 text-xs text-ink-soft">
          باقي {nextAt - count} للوصول إلى المستوى التالي.
        </p>
      )}

      {/* الرابط */}
      <div className="mb-3 flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
        <span className="min-w-0 flex-1 truncate text-xs text-ink-soft" dir="ltr">
          {link}
        </span>
        <button
          onClick={copy}
          className="shrink-0 rounded-lg bg-teal px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-dark"
        >
          {copied ? "✓ نُسخ" : "نسخ"}
        </button>
      </div>

      {/* أزرار المشاركة */}
      <div className="flex items-center gap-2">
        <a
          href={wa}
          target="_blank"
          rel="noreferrer"
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-green-600 px-3 py-2.5 text-sm font-medium text-white hover:bg-green-700"
        >
          <WhatsAppIcon />
          واتساب
        </a>
        <a
          href={tg}
          target="_blank"
          rel="noreferrer"
          aria-label="مشاركة عبر تلغرام"
          className="flex h-10 w-11 items-center justify-center rounded-xl bg-sky-500 text-white hover:bg-sky-600"
        >
          <TelegramIcon />
        </a>
        <button
          onClick={shareNative}
          aria-label="مشاركة"
          className="flex h-10 w-11 items-center justify-center rounded-xl border border-border bg-card text-ink-soft hover:border-teal"
        >
          ⤴️
        </button>
      </div>
    </div>
  );
}
