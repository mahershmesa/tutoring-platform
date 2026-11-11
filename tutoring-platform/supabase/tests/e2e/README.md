# اختبار الواجهة من طرف لطرف (محلياً)

يشغّل التطبيق الحقيقي مقابل القاعدة المحلية عبر PostgREST حقيقي (نفس محرّك
REST في Supabase)، فتُختبر الصفحات وأنت مسجّل دخول مع RLS الفعلي.

المكوّنات:
- قاعدة `e2e`: `../security/build.sh e2e` ثم `seed.sql` + دور `authenticator`
  (`create role authenticator login noinherit; grant anon, authenticated, service_role to authenticator;`).
- PostgREST على 3301 (`db-anon-role=anon`, `jwt-secret=$JWT_SECRET`).
- `gateway.js` على 3300: يحاكي عنوان Supabase — `/rest/v1` → PostgREST،
  `/auth/v1` مصادقة مبسّطة لمستخدمي `seed.sql` (أي كلمة مرور)، `/storage/v1` روابط وهمية.
  `node gateway.js keys` يطبع مفتاحي anon و service_role.
- التطبيق: يُبنى بـ `NEXT_PUBLIC_SUPABASE_URL=http://localhost:3300` والمفتاحين،
  ثم `next start -p 3130`.
- `scenario.js` (Playwright): طالب يرى شارة الجرس ← الإشعارات ← يفتح الرد
  فيُعلَّم مقروءاً؛ ثم مدرّس يرى رسالة الطالب في الوارد.

ملاحظة: المتصفح يُشغَّل بـ `bypassCSP` لأن عنوان Supabase المحلي http.
