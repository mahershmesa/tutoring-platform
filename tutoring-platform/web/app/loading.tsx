// مؤشّر تحميل فوري أثناء جلب بيانات الصفحة (يحسّن إحساس سرعة الانتقال).
export default function Loading() {
  return (
    <div className="dalili-loader" role="status" aria-label="جارٍ التحميل">
      <div className="dalili-spinner" />
    </div>
  );
}
