import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f1f7f3",
          100: "#dcebe1",
          200: "#b9d7c4",
          300: "#8fbea1",
          400: "#5f9d78",
          500: "#3d7f57",
          600: "#2e7d46",
          700: "#1F4E2E",
          800: "#1a4026",
          900: "#173620",
        },
        gold: {
          400: "#e0b25e",
          500: "#c68a1e",
          600: "#9C6B1E",
        },
      },
      borderRadius: { xl: "0.85rem", "2xl": "1.1rem" },
    },
  },
  plugins: [],
};
export default config;
