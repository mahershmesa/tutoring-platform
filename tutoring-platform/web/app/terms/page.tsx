import type { Metadata } from "next";
import Link from "next/link";
import Logo from "@/components/Logo";

export const metadata: Metadata = { title: "شروط الاستخدام — دليلي" };

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <Logo />
        <Link href="/" className="text-sm text-ink-soft hover:text-teal-dark">
          ← الرئيسية
        </Link>
      </div>

      <h1 className="mb-2 text-2xl font-bold text-ink">شروط الاستخدام</h1>
      <p className="mb-6 rounded-xl bg-amber-light px-3 py-2 text-sm text-ink">
        مسودّة مبدئية توضيحية. باستخدامك المنصة فأنت توافق على هذه الشروط.
      </p>

      <ul className="list-disc space-y-2 pr-5 text-sm leading-relaxed text-ink-soft">
        <li>تقدّم منصة «دليلي» وسيلة لربط الطلاب بالمدرّسين، ولا تكون طرفاً في أي اتفاق بينهما.</li>
        <li>يتعهّد المستخدم بأن بياناته صحيحة، والمدرّس مسؤول عن صحة مؤهّلاته ووثائقه.</li>
        <li>تراجع الإدارة طلبات توثيق المدرّسين، ولها حق القبول أو الرفض دون إبداء الأسباب.</li>
        <li>يُمنع نشر محتوى مسيء أو مخالف أو مضلّل، أو انتحال صفة الغير.</li>
        <li>قد يؤدي إساءة الاستخدام إلى تعطيل الحساب دون إشعار مسبق.</li>
        <li>تُعامَل بياناتك وفق <Link href="/privacy" className="text-teal-dark hover:underline">سياسة الخصوصية</Link>.</li>
        <li>قد نحدّث هذه الشروط، ويسري التحديث فور نشره.</li>
      </ul>
    </main>
  );
}
