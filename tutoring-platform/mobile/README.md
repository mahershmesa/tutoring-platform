# مدرستي — تطبيق الموبايل (Mobile App)

تطبيق موبايل لمنصة **مدرستي** التعليمية العربية، مبني بـ **Expo + React Native + TypeScript** مع دعم **RTL** كامل.
يشارك نفس الـ backend (Supabase) المستخدَم في تطبيق الويب داخل هذا المستودع.

## المتطلبات

- Node.js 20+ و npm
- تطبيق **Expo Go** على هاتفك (أو محاكي Android/iOS)

## الأدوار

يدعم التطبيق ثلاثة أنواع مستخدمين (تطابق `user_role` في قاعدة البيانات):

- **طالب** (`student`)
- **معلّم** (`teacher`)
- **مشرف/أدمن** (`admin`)

## الإعداد

1. ثبّت الاعتماديات:

   ```bash
   npm install
   ```

2. انسخ ملف البيئة واملأ قيم Supabase:

   ```bash
   cp .env.example .env
   ```

   ثم عبّئ القيم من لوحة مشروع Supabase (**Project Settings → API**):

   ```
   EXPO_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-ref.supabase.co
   EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=المفتاح-العام-القابل-للنشر
   ```

   > ⚠️ استخدم المفتاح **العام** (Publishable / anon) فقط — يحترم سياسات RLS وآمن للعميل.
   > لا تضع مفتاح الخدمة (service_role / secret) في تطبيق الموبايل إطلاقاً.

3. شغّل التطبيق (مع مسح الكاش بعد أي تعديل على `.env`):

   ```bash
   npx expo start -c
   ```

   امسح رمز QR بتطبيق Expo Go لفتح التطبيق على هاتفك.

## بنية المشروع

```
mobile/
├── App.tsx                 # الجذر: يفعّل RTL ويعرض شاشة تحقّق مؤقتة
├── app.json                # إعداد Expo (الاسم: مدرستي، slug: madrasati)
├── .env.example            # قالب متغيّرات البيئة (انسخه إلى .env)
└── src/
    ├── config/
    │   └── env.ts          # قراءة متغيّرات البيئة والتحقق منها
    ├── lib/
    │   └── supabase.ts     # عميل Supabase (AsyncStorage + persistSession)
    ├── i18n/
    │   └── rtl.ts          # تفعيل اتجاه RTL
    └── types/
        ├── roles.ts        # أنواع الأدوار والتسميات العربية
        └── database.ts     # نوع قاعدة البيانات (enums) — قابل للتوليد الكامل لاحقاً
```

## استخدام عميل Supabase

```ts
import { supabase } from "./src/lib/supabase";

const { data, error } = await supabase.from("subjects").select("*");
```

## توليد أنواع قاعدة البيانات الكاملة (اختياري لاحقاً)

```bash
npx supabase gen types typescript --project-id <PROJECT_REF> > src/types/database.ts
```

## الحالة الحالية

تم إنجاز **الإعداد الأساسي فقط**: هيكل المشروع، دعم RTL، وتهيئة عميل Supabase.
**لم تُبنَ أي شاشات بعد** (تسجيل الدخول، لوحات الطالب/المعلّم/الأدمن) — هذه خطوات لاحقة.
