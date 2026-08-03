// أنواع مبسّطة تعكس ما ترجعه دوال القاعدة والجداول المستخدمة في الواجهة.
// (لاحقاً يمكن توليد أنواع كاملة عبر: supabase gen types typescript)

export type Subject = {
  id: string;
  name: string;
};

export type Governorate = {
  id: number;
  name: string;
};

export type Stage = {
  id: number;
  name: string;
};

// صف يرجع من map_teachers() — نقاط الخريطة
export type MapTeacher = {
  user_id: string;
  full_name: string;
  photo_url: string | null;
  governorate_id: number;
  governorate_name: string;
  latitude: number;
  longitude: number;
  answered_count: number;
  subjects: string[];
  stages: string[];
};
