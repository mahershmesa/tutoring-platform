"use client";

/**
 * زر عائم "الأخبار" (عنبري) بزاوية أسفل-يمين، يمرّر بسلاسة لقسم الأخبار.
 * يُعرض فقط عند وجود أخبار. مرفوع قليلاً عن الحافة حتى لا يغطّي إسناد الخريطة.
 */
export default function NewsFab() {
  function goToNews() {
    document
      .getElementById("news-section")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <button
      onClick={goToNews}
      aria-label="اذهب إلى الأخبار"
      className="fixed bottom-16 right-5 z-[900] flex items-center gap-1.5 rounded-full bg-amber px-4 py-2.5 text-sm font-bold text-white shadow-lg transition hover:brightness-105"
    >
      الأخبار
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
    </button>
  );
}
