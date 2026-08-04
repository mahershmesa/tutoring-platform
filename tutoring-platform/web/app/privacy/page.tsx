import type { Metadata } from "next";
import Link from "next/link";
import Logo from "@/components/Logo";

export const metadata: Metadata = { title: "سياسة الخصوصية — دليلي" };

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <Logo />
        <Link href="/" className="text-sm text-ink-soft hover:text-teal-dark">
          ← الرئيسية
        </Link>
      </div>

      <h1 className="mb-2 text-2xl font-bold text-ink">سياسة الخصوصية</h1>
      <p className="mb-6 rounded-xl bg-amber-light px-3 py-2 text-sm text-ink">
        هذه مسودّة مبدئية توضيحية لبيان ممارساتنا، وليست نصاً قانونياً رسمياً
        كاملاً. قد نحدّثها مع تطوّر المنصة.
      </p>

      <div className="space-y-5 text-sm leading-relaxed text-ink">
        <Section title="ما البيانات التي نجمعها؟">
          <ul className="list-disc space-y-1 pr-5 text-ink-soft">
            <li>الاسم ورقم الهاتف (لإنشاء الحساب والتواصل).</li>
            <li>المحافظة والمرحلة الدراسية (للطالب) أو المواد والمراحل (للمدرّس).</li>
            <li>
              للمدرّس: بيانات اختيارية (المدرسة، المعهد، روابط تلغرام/انستغرام،
              بريد للتواصل، صورة شخصية).
            </li>
            <li>
              <strong>وثيقة إثبات الهوية التعليمية</strong> (للمدرّس) أو البطاقة
              الطلابية (اختياري) — لأغراض التوثيق فقط.
            </li>
            <li>الأسئلة والرسائل والمرفقات التي تتبادلها داخل المنصة.</li>
          </ul>
        </Section>

        <Section title="لماذا نجمعها؟">
          <p className="text-ink-soft">
            لربط الطلاب بمدرّسين مناسبين حسب المحافظة والمادة والمرحلة، وللتحقق من
            المدرّسين قبل ظهورهم، ولتمكين التواصل بين الطرفين. لا نبيع بياناتك ولا
            نشاركها مع جهات إعلانية.
          </p>
        </Section>

        <Section title="من يرى بياناتك؟">
          <ul className="list-disc space-y-1 pr-5 text-ink-soft">
            <li>
              <strong>المدرّس المقبول:</strong> تظهر بياناته العامة (الاسم،
              المادة، المحافظة، روابط التواصل التي أدخلها) للزوّار على الخريطة.
            </li>
            <li>
              <strong>وثيقة الهوية:</strong> لا يراها إلا صاحبها وفريق الإدارة —
              حصراً لمراجعة التوثيق. لا تظهر للعامة أبداً.
            </li>
            <li>
              <strong>الرسائل والمرفقات:</strong> خاصّة بطرفَي المحادثة فقط (الطالب
              والمدرّس المحدّد).
            </li>
            <li>الطالب: بياناته الشخصية لا تظهر للعامة.</li>
          </ul>
        </Section>

        <Section title="الأمان والتخزين">
          <p className="text-ink-soft">
            تُخزّن البيانات على بنية Supabase مع ضوابط وصول صارمة على مستوى قاعدة
            البيانات. الملفات الحسّاسة (وثائق الهوية والمرفقات) في مساحات تخزين
            خاصة تُعرض عبر روابط مؤقتة فقط لمن يحق له.
          </p>
        </Section>

        <Section title="حقوقك">
          <p className="text-ink-soft">
            تستطيع تعديل بياناتك من صفحة البروفايل، أو تعطيل حسابك في أي وقت. عند
            الحاجة لحذف بياناتك بالكامل، تواصل معنا.
          </p>
        </Section>

        <Section title="التواصل">
          <p className="text-ink-soft">
            لأي استفسار حول خصوصيتك أو بياناتك، تواصل مع إدارة المنصة.
          </p>
        </Section>

        <p className="pt-2 text-center text-ink-soft">
          اطّلع أيضاً على{" "}
          <Link href="/terms" className="text-teal-dark hover:underline">
            شروط الاستخدام
          </Link>
          .
        </p>
      </div>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-1.5 font-bold text-teal-dark">{title}</h2>
      {children}
    </section>
  );
}
