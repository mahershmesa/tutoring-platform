"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "dalili_install_banner_dismissed";

// بنر تثبيت بارز وقابل للإخفاء أعلى الرئيسية — أسهل طريقة لحفظ التطبيق.
export default function InstallBanner() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [iosOpen, setIosOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(DISMISS_KEY) === "1") return;
    } catch {}
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // @ts-expect-error خاص بـ Safari على iOS
      window.navigator.standalone === true;
    if (standalone) return; // مثبّت أصلاً

    if (/iphone|ipad|ipod/i.test(navigator.userAgent)) {
      setIsIOS(true);
      setShow(true);
      return;
    }
    const onBIP = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setShow(true);
    };
    const onInstalled = () => setShow(false);
    window.addEventListener("beforeinstallprompt", onBIP);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBIP);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {}
    setShow(false);
  }

  async function install() {
    if (!deferred) return;
    setBusy(true);
    try {
      await deferred.prompt();
      await deferred.userChoice;
      dismiss();
    } finally {
      setBusy(false);
    }
  }

  if (!show) return null;

  return (
    <div className="rounded-2xl border border-teal/40 bg-gradient-to-l from-teal-light to-white p-3 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="text-2xl" aria-hidden>
          📲
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-ink">
            ثبّت تطبيق دليلي على شاشتك
          </p>
          <p className="text-xs text-ink-soft">وصول أسرع وإشعارات فورية.</p>
        </div>
        {isIOS ? (
          <button
            onClick={() => setIosOpen((v) => !v)}
            className="shrink-0 rounded-xl bg-teal px-3 py-2 text-xs font-bold text-white hover:bg-teal-dark"
          >
            طريقة التثبيت
          </button>
        ) : (
          <button
            onClick={install}
            disabled={busy}
            className="shrink-0 rounded-xl bg-teal px-4 py-2 text-xs font-bold text-white hover:bg-teal-dark disabled:opacity-60"
          >
            {busy ? "…" : "تثبيت"}
          </button>
        )}
        <button
          onClick={dismiss}
          aria-label="إخفاء"
          className="shrink-0 rounded-lg px-2 py-1 text-ink-soft hover:text-ink"
        >
          ✕
        </button>
      </div>

      {isIOS && iosOpen && (
        <ol className="mt-3 space-y-1.5 border-t border-teal/20 pt-3 text-sm text-ink">
          <li>
            ١. اضغط زر المشاركة <span aria-hidden>⬆️</span> في شريط Safari بالأسفل.
          </li>
          <li>٢. اختر «أضف إلى الشاشة الرئيسية».</li>
          <li>٣. اضغط «إضافة» — وتظهر أيقونة دليلي على شاشتك.</li>
        </ol>
      )}
    </div>
  );
}
