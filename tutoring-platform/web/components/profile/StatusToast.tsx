"use client";

/**
 * رسالة عائمة ثابتة أسفل الشاشة — تظهر بغضّ النظر عن موضع التمرير،
 * حتى يراها المستخدم بعد الضغط على "حفظ" مهما كان طول النموذج.
 */
export default function StatusToast({
  status,
}: {
  status: { ok?: boolean; text: string } | null;
}) {
  if (!status) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[1000] flex justify-center px-4">
      <div
        role="status"
        aria-live="polite"
        className={
          "pointer-events-auto rounded-xl px-5 py-3 text-sm font-medium shadow-lg " +
          (status.ok ? "bg-teal text-white" : "bg-red-600 text-white")
        }
      >
        {status.ok ? "✓ " : "⚠ "}
        {status.text}
      </div>
    </div>
  );
}
