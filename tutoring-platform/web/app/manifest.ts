import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "دليلي — ربط الطلاب بالمدرّسين",
    short_name: "دليلي",
    description: "منصة تربط الطلاب بمدرّسين موثّقين حسب المحافظة والمادة في العراق.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f9fa",
    theme_color: "#1aa6a0",
    lang: "ar",
    dir: "rtl",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
