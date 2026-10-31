"use client";

import { useEffect, useState } from "react";

// حدث التثبيت (غير معرّف في أنواع TS القياسية).
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export default function InstallSection() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // @ts-expect-error خاص بـ Safari على iOS
      window.navigator.standalone === true;
    if (standalone) {
      setInstalled(true);
      return;
    }
    setIsIOS(/iphone|ipad|ipod/i.test(navigator.userAgent));

    const onBIP = (e: Event) => {
      e.preventDefault(); // نمنع الشريط التلقائي ونعرض زرّنا بدله
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onBIP);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBIP);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  async function install() {
    if (!deferred) return;
    setBusy(true);
    try {
      await deferred.prompt();
      await deferred.userChoice;
    } finally {
      setDeferred(null);
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-teal/30 bg-teal-light/50 p-5">
      <div className="flex items-start gap-3">
        <span className="text-2xl" aria-hidden>
          📲
        </span>
        <div className="flex-1">
          <h2 className="font-bold text-ink">ثبّت تطبيق دليلي على جهازك</h2>
          <p className="mt-1 text-sm text-ink-soft">
            وصول أسرع، يعمل كتطبيق مستقل، وتصلك الإشعارات الفورية.
          </p>

          {deferred ? (
            // أندرويد / كروم / إيدج (ديسكتوب أو موبايل): تثبيت بنقرة
            <button
              onClick={install}
              disabled={busy}
              className="mt-3 rounded-xl bg-teal px-4 py-2 text-sm font-medium text-white hover:bg-teal-dark disabled:opacity-60"
            >
              {busy ? "…جارٍ" : "تثبيت التطبيق"}
            </button>
          ) : isIOS ? (
            // آيفون / آيباد (Safari): لا تثبيت تلقائي — خطوات يدوية
            <ol className="mt-3 space-y-1.5 text-sm text-ink">
              <li>
                ١. اضغط زر المشاركة{" "}
                <span aria-hidden>⬆️</span> في شريط Safari بالأسفل.
              </li>
              <li>٢. اختر «أضف إلى الشاشة الرئيسية».</li>
              <li>٣. اضغط «إضافة» — وتظهر أيقونة دليلي على شاشتك.</li>
            </ol>
          ) : (
            // ديسكتوب/متصفحات أخرى: إرشاد عام
            <p className="mt-3 text-sm text-ink">
              من قائمة المتصفح اختر «تثبيت التطبيق» أو «إضافة إلى الشاشة
              الرئيسية». (في كروم/إيدج على الكمبيوتر: أيقونة التثبيت ⊕ في شريط
              العنوان.)
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
