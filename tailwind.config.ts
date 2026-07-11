import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ink: "#172033",
        mist: "#f5f7fb",
        field: "#2563eb",
        fern: "#16a34a",
        ember: "#f97316"
      },
      boxShadow: {
        soft: "0 16px 50px rgba(31, 41, 55, 0.10)",
        lift: "0 10px 28px rgba(15, 23, 42, 0.12)"
      }
    }
  },
  plugins: []
} satisfies Config;
