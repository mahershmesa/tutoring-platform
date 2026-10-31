"use client";

import { useEffect } from "react";

// يُخفي شاشة البداية (المُقدَّمة من الخادم) بلطف بعد أن تصبح الصفحة جاهزة.
export default function SplashFader() {
  useEffect(() => {
    const hide = () =>
      document.getElementById("dalili-splash")?.classList.add("hide");
    // حد أدنى لطيف لظهور اللوغو، ثم الإخفاء
    const t = setTimeout(hide, 700);
    return () => clearTimeout(t);
  }, []);
  return null;
}
