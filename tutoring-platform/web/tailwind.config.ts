import type { Config } from "tailwindcss";

// الألوان كـ design tokens عبر متغيّرات CSS (قنوات RGB حتى تعمل الشفافية /50).
// القيم الفعلية تُعرَّف في globals.css لـ :root (نهار) و[data-theme="dark"] (ليل).
const rgb = (v: string) => `rgb(var(${v}) / <alpha-value>)`;

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        teal: {
          DEFAULT: rgb("--c-teal"),
          dark: rgb("--c-teal-dark"),
          light: rgb("--c-teal-light"),
        },
        amber: {
          DEFAULT: rgb("--c-amber"),
          light: rgb("--c-amber-light"),
        },
        ink: {
          DEFAULT: rgb("--c-ink"),
          soft: rgb("--c-ink-soft"),
        },
        surface: rgb("--c-surface"),
        card: rgb("--c-card"),
        border: rgb("--c-border"),
      },
      fontFamily: {
        sans: ["var(--font-cairo)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
