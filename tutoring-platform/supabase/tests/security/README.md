# اختبارات الأمان على قاعدة محلية

لا يوجد وصول مباشر لقاعدة الإنتاج، فنختبر على Postgres محلي يحاكي Supabase
(الأدوار `anon`/`authenticated`/`service_role`، الصلاحيات الافتراضية، `auth.uid()`،
مخطط `storage`، وبديل وهمي لـ `pg_net`).

```bash
./build.sh audit            # يطبّق كل الـ migrations على قاعدة جديدة اسمها audit
psql -d audit -f seed.sql   # بيانات تجريبية (مدراء، مدرّسون، طلاب، سؤال، اختبار)
psql -d audit -f attacks.sql      # هجمات: كل سطر يجب أن يكون 🟢 SAFE
psql -d audit -f functional.sql   # مسارات المستخدم الطبيعية يجب أن تنجح كلها
```

`attacks.sql` و`functional.sql` يتراجعان عن كل تغيير (rollback) فيمكن تكرارهما.

المتوقع في `attacks.sql`: سطران فقط 🔴 (V2c و V2d) — تسريب مقبول ومُوثَّق: الدليل
العام يحتاج أن يستطيع الزائر تنفيذ `is_banned`/`is_account_deactivated`.

## ملف المطابقة (`../../tools/converge_schema_to_41.sql`)

يعيد فرض كل الدوال/التريغرات/السياسات/العروض/حدود التخزين كما هي عند migration 41،
ويُخرج تقرير فروقات. استُعمل لإصلاح قاعدة الإنتاج بعد اكتشاف أن الدفعتين 16 و25
لم تُطبَّقا عليها. **لا تشغّله بعد migrations أحدث من 41** — سيعيد الدوال لحالة 41.
لإعادة توليده لحالة أحدث:

```bash
./build.sh expect && psql -d expect -q -f dump_expected.sql > expected.json
python3 gen_converge.py   # يكتب converge.sql
```

درس مهم: بعد لصق أي migration في SQL Editor، تأكد أن النتيجة نجاح فعلاً —
المحرّر يتراجع عن الملف كله عند أول خطأ.
