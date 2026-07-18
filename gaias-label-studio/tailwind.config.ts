import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f4f7f5",
          100: "#e4ece6",
          200: "#c6d9cb",
          300: "#9ebda7",
          400: "#719d7f",
          500: "#4f7f60",
          600: "#3c654c",
          700: "#31513e",
          800: "#294234",
          900: "#23372c",
        },
        canvasgray: "#e9ebee",
      },
      boxShadow: {
        panel: "0 10px 30px -12px rgba(0,0,0,0.25)",
      },
    },
  },
  plugins: [],
} satisfies Config;
