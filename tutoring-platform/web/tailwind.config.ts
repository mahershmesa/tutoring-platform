import type { Config } from "tailwindcss";

// الألوان منقولة من prototype/index.html (teal / amber) كـ design tokens
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        teal: {
          DEFAULT: "#1aa6a0",
          dark: "#0f7a75",
          light: "#e3f6f5",
        },
        amber: {
          DEFAULT: "#f0a500",
          light: "#fdf3d7",
        },
        ink: {
          DEFAULT: "#1f2933",
          soft: "#66727d",
        },
        surface: "#f7f9fa",
        border: "#e2e8ec",
      },
      fontFamily: {
        sans: ["var(--font-cairo)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
