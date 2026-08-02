# دليلي — واجهة Next.js

واجهة المنصة، مبنية بـ **Next.js (App Router) + TypeScript + Tailwind**، متصلة بـ
Supabase عبر `@supabase/ssr` (يحترم RLS).

## التشغيل

```bash
cd web
npm install
cp .env.local.example .env.local   # ثم املأ قيم Supabase
npm run dev                        # http://localhost:3000
```

متغيّرات البيئة المطلوبة (من Supabase → Project Settings → API):

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

> بدون `.env.local` يعمل التطبيق ويعرض إشعاراً بأن الاتصال غير مضبوط
> (الشاشة تُرسم لكن بلا بيانات حيّة).

## أول شاشة

`app/page.tsx` (Server Component) تجلب:
- `subjects` (شرائح الفلترة) — بيانات مضمونة من القاعدة.
- `map_teachers()` (نقاط الخريطة) — المدرّسون المقبولون الظاهرون.

ثم تمرّرها إلى `components/HomeView.tsx` (Client) الذي يعرض الشرائح والخريطة
(`components/map/TeacherMap.tsx` عبر Leaflet، تحميل client-only) ويفلتر حسب المادة.

لرؤية نقاط على الخريطة محلياً، طبّق البيانات التجريبية:
```bash
supabase db reset   # يشغّل الـ migrations ثم supabase/seed.sql
```

## البنية

```
web/
├── app/            layout (RTL/عربي) + الصفحة الرئيسية
├── components/     HomeView + خريطة Leaflet
├── lib/supabase/   عملاء الخادم/المتصفح + الأنواع
└── middleware.ts   تحديث جلسة Supabase
```

## الأمان

العميل يستخدم **anon key** فقط؛ كل استعلام يمرّ عبر RLS في القاعدة.
لا يُوضع `service_role key` في الواجهة إطلاقاً.
