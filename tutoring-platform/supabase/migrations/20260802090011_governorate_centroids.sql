-- =============================================================
-- 20260802090011_governorate_centroids.sql
-- إحداثيات مراكز المحافظات الـ18 — تُستخدم لموضع النقطة على الخريطة
-- ولحساب "الأقرب لمحافظة الطالب". إحداثيات تقريبية (مراكز المدن).
-- =============================================================

alter table public.governorates
  add column latitude  double precision,
  add column longitude double precision;

comment on column public.governorates.latitude  is 'خط العرض لمركز المحافظة (موقع تقريبي).';
comment on column public.governorates.longitude is 'خط الطول لمركز المحافظة (موقع تقريبي).';

update public.governorates set latitude = v.lat, longitude = v.lon
from (values
  ('بغداد',      33.3152, 44.3661),
  ('البصرة',     30.5085, 47.7804),
  ('نينوى',      36.3450, 43.1450),
  ('أربيل',      36.1901, 44.0091),
  ('النجف',      31.9990, 44.3291),
  ('كربلاء',     32.6160, 44.0242),
  ('الأنبار',    33.4258, 43.3006),
  ('ديالى',      33.7500, 44.6440),
  ('ذي قار',     31.0540, 46.2570),
  ('بابل',       32.4820, 44.4330),
  ('واسط',       32.5120, 45.8180),
  ('ميسان',      31.8330, 47.1440),
  ('المثنى',     31.3320, 45.2950),
  ('القادسية',   31.9890, 44.9250),
  ('صلاح الدين', 34.6000, 43.6780),
  ('كركوك',      35.4680, 44.3920),
  ('دهوك',       36.8670, 42.9480),
  ('السليمانية', 35.5560, 45.4350)
) as v(name, lat, lon)
where public.governorates.name = v.name;

-- بعد التعبئة نضمن عدم وجود قيم فارغة مستقبلاً
alter table public.governorates
  alter column latitude  set not null,
  alter column longitude set not null;
