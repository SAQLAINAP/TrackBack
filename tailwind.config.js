/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "sans-serif"],
      },
      colors: {
        ink: {
          DEFAULT: "#18181b",
          soft: "#3f3f46",
          faint: "#71717a",
        },
        paper: {
          DEFAULT: "#fafaf9",
          card: "#ffffff",
        },
      },
      boxShadow: {
        soft: "0 1px 2px rgba(0,0,0,0.04), 0 8px 24px -12px rgba(0,0,0,0.12)",
        lift: "0 2px 4px rgba(0,0,0,0.05), 0 16px 40px -16px rgba(0,0,0,0.2)",
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
      },
    },
  },
  plugins: [],
};
