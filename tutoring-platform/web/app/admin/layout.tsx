import Link from "next/link";
import { requireAdmin } from "@/lib/admin/guard";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // يحمي كل مسارات /admin/* — غير الأدمن يُحوّل بعيداً
  await requireAdmin();

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-teal-dark">لوحة الإدارة</h1>
        <Link href="/" className="text-sm text-ink-soft hover:text-teal-dark">
          ← الموقع
        </Link>
      </header>

      <nav className="mb-5 flex flex-wrap gap-2 text-sm">
        <Link
          href="/admin"
          className="rounded-xl border border-border px-3 py-1.5 text-ink-soft hover:border-teal"
        >
          الموجز
        </Link>
        <Link
          href="/admin/teachers"
          className="rounded-xl border border-border px-3 py-1.5 text-ink-soft hover:border-teal"
        >
          توثيق المدرّسين
        </Link>
        <Link
          href="/admin/subjects"
          className="rounded-xl border border-border px-3 py-1.5 text-ink-soft hover:border-teal"
        >
          المواد
        </Link>
        <Link
          href="/admin/ads"
          className="rounded-xl border border-border px-3 py-1.5 text-ink-soft hover:border-teal"
        >
          الإعلانات
        </Link>
        <Link
          href="/admin/news"
          className="rounded-xl border border-border px-3 py-1.5 text-ink-soft hover:border-teal"
        >
          الأخبار
        </Link>
      </nav>

      {children}
    </div>
  );
}
