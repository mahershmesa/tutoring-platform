import Link from "next/link";

/**
 * شعار "دليلي" كشارة (badge) بخلفية التيل ونص أبيض — نفس هوية أيقونة الـ PWA.
 * size: "md" افتراضي (الهيدر)، "lg" لصفحات الدخول/التسجيل.
 */
export default function Logo({
  size = "md",
  href = "/",
}: {
  size?: "md" | "lg";
  href?: string | null;
}) {
  const cls =
    "inline-block rounded-xl bg-teal font-bold text-white shadow-sm " +
    (size === "lg" ? "px-4 py-2 text-2xl" : "px-3 py-1 text-xl");

  const badge = <span className={cls}>دليلي</span>;

  if (!href) return badge;
  return (
    <Link href={href} aria-label="دليلي — الصفحة الرئيسية">
      {badge}
    </Link>
  );
}
