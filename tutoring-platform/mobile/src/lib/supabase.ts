// polyfill لـ URL/URLSearchParams المطلوب من مكتبة supabase-js على React Native.
// يجب أن يُستورد قبل إنشاء العميل.
import "react-native-url-polyfill/auto";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

import { env } from "../config/env";
import type { Database } from "../types/database";

/**
 * عميل Supabase الموحّد للتطبيق.
 *
 * - يخزّن جلسة المصادقة في AsyncStorage ليبقى المستخدم مسجّلاً بين الجلسات.
 * - `detectSessionInUrl: false` لأننا في بيئة موبايل (لا يوجد رابط متصفح
 *   يحمل رمز الجلسة كما في الويب).
 * - يستخدم المفتاح العام (Publishable) الذي يحترم سياسات RLS.
 */
export const supabase = createClient<Database>(
  env.supabaseUrl,
  env.supabasePublishableKey,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);
