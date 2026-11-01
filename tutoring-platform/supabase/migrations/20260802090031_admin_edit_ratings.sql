-- =============================================================
-- 20260802090031_admin_edit_ratings.sql — تعديل الأدمن للتقييمات
-- الحذف مسموح للأدمن أصلاً (سياسة "owner or admin deletes rating").
-- هنا نضيف صلاحية التعديل (UPDATE) للأدمن على أي تقييم (إشراف).
-- المتوسّط والعدد يُحسبان حيّاً من الجدول، فينعكس التعديل/الحذف فوراً في الدليل.
-- =============================================================

drop policy if exists "admin edits any rating" on public.teacher_ratings;
create policy "admin edits any rating"
  on public.teacher_ratings for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
