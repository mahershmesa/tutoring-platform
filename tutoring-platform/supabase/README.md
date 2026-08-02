# قاعدة بيانات منصة دليلي (Supabase / Postgres)

مخطط قاعدة البيانات كامل على شكل **migrations** مرتّبة، كل ملف مستقل ويحتوي جداوله
وسياسات الأمان (RLS) الخاصة بيه. مبني حسب `../CLAUDE.md`.

## ترتيب الملفات

| # | الملف | المحتوى |
|---|-------|---------|
| 1 | `20260802090001_init_enums_and_helpers.sql` | الإضافات، الأنواع (enums)، دالة `updated_at` |
| 2 | `20260802090002_roles.sql` | جدول `user_roles` + دوال `is_admin()` / `has_role()` |
| 3 | `20260802090003_lookups.sql` | `governorates` (18 محافظة)، `stages` (7 مراحل)، `subjects` |
| 4 | `20260802090004_profiles.sql` | `student_profiles`، `teacher_profiles` + تريغرات |
| 5 | `20260802090005_teacher_relations.sql` | `teacher_subjects`، `teacher_stages` |
| 6 | `20260802090006_qa_flow.sql` | `questions`، `notifications`، `messages` + منطق التوزيع والعدّاد |
| 7 | `20260802090007_admin_content.sql` | `ads`، `news` |
| 8 | `20260802090008_seed_subjects.sql` | مواد ابتدائية |

## خريطة العلاقات

```
auth.users (Supabase Auth)
  ├──1:1─ student_profiles ──> governorates, stages
  ├──1:1─ teacher_profiles ──> governorates
  │          ├──M:N─ teacher_subjects ──> subjects
  │          └──M:N─ teacher_stages   ──> stages
  └──1:N─ user_roles (student/teacher/admin)

questions (student_id) ──> subjects, stages, governorates
  ├──1:N─ notifications (teacher_id)   [تُنشأ تلقائياً للمدرسين المطابقين]
  └──1:N─ messages (sender_id)

ads, news  [محتوى تديره الإدارة]
```

## قرارات تصميمية مهمة

- **بروفايلان منفصلان** (طالب/مدرّس) بدل جدول واحد فيه أعمدة فاضية.
- **جداول مرجعية** للمحافظات والمراحل (بيانات ثابتة)، بينما **المواد جدول كامل** لأن الإدارة تضيفها.
- **الحقول الحسّاسة للمدرّس** (`verification_status`, `answered_count`) محميّة بتريغر
  يمنع أي غير إداري من تعديلها، حتى لو مرّ عبر سياسة تحديث البروفايل.
- **توزيع الإشعارات** يتم عبر تريغر عند إنشاء السؤال: مطابقة (مادة + مرحلة + محافظة)
  للمدرّسين المقبولين فقط.
- **عدّاد "أجاب على X طالب"** يزيد تلقائياً لما الطالب يحوّل الإشعار إلى `answered`.
- **تعديل مرحلة الطالب يمسح أسئلته** عبر تريغر (منطق مطلوب صراحة في `CLAUDE.md`).

## الأمان (RLS)

كل الجداول عليها Row Level Security مفعّل:
- بيانات عامة (المحافظات، المراحل، المواد، المدرّسون المقبولون، الإعلانات المفعّلة،
  الأخبار) مقروءة حتى **بدون تسجيل دخول** (`anon`).
- كل مستخدم يقرأ/يعدّل بياناته الخاصة فقط.
- **الإدارة (`admin`)** وحدها تقبل/ترفض المدرسين، وتضيف المواد، وتدير الإعلانات والأخبار.

### تعيين أول مدير (Admin)

سياسات RLS تسمح فقط للإدارة بإسناد الأدوار، لذا **أول admin يُضاف يدوياً**
من SQL Editor في Supabase (يعمل بصلاحية service role تتجاوز RLS):

```sql
insert into public.user_roles (user_id, role)
values ('<UUID-المستخدم-من-auth.users>', 'admin');
```

## طريقة التطبيق

**عبر Supabase CLI (موصى به):**
```bash
supabase db push          # يطبّق كل الـ migrations بالترتيب
# أو محلياً:
supabase start
supabase migration up
```

**أو يدوياً:** انسخ محتوى كل ملف بالترتيب (1 → 8) ونفّذه في SQL Editor.

## الخطوات التالية المقترحة

1. تخزين الملفات: إنشاء buckets في Supabase Storage (`avatars`, `id-documents`,
   `ads`) + سياسات الوصول إليها.
2. تريغر إنشاء بروفايل تلقائي عند التسجيل (`on auth.users` insert).
3. طبقة الاستعلامات للخريطة (فلترة محافظة/مادة + احترام `location_visible`).
