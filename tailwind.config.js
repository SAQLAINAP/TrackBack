/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        // Bundled via @fontsource — offline safe.
        sans: ["'Plus Jakarta Sans Variable'", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["'Sora Variable'", "'Plus Jakarta Sans Variable'", "ui-sans-serif", "sans-serif"],
        mono: ["'JetBrains Mono Variable'", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      colors: {
        ink: {
          DEFAULT: "#18181b",
          soft: "#52525b",
          faint: "#8b8b94",
        },
        paper: {
          DEFAULT: "#f7f7f5",
          card: "#ffffff",
        },
        // Dark-mode surfaces: slightly blue-shifted near-black so it reads richer than flat grey.
        surface: {
          DEFAULT: "#0a0a0f",
          raised: "#12121a",
          hi: "#1a1a24",
        },
        accent: {
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
        },
      },
      boxShadow: {
        soft: "0 1px 2px rgba(0,0,0,0.04), 0 8px 24px -12px rgba(0,0,0,0.12)",
        lift: "0 2px 4px rgba(0,0,0,0.05), 0 16px 40px -16px rgba(0,0,0,0.2)",
        // Dark-mode depth + accent bloom
        glow: "0 0 0 1px rgba(255,255,255,0.04), 0 8px 32px -8px rgba(99,102,241,0.35)",
        "glow-lg": "0 0 0 1px rgba(255,255,255,0.06), 0 16px 48px -12px rgba(99,102,241,0.45)",
        inset: "inset 0 1px 0 0 rgba(255,255,255,0.06)",
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
        "3xl": "1.5rem",
      },
      backgroundImage: {
        "accent-grad": "linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #d946ef 100%)",
        "accent-soft": "linear-gradient(135deg, rgba(99,102,241,0.14), rgba(217,70,239,0.10))",
      },
      // Safe-area aware spacing for Android/iOS edge-to-edge display.
      spacing: {
        "safe-t": "env(safe-area-inset-top)",
        "safe-b": "env(safe-area-inset-bottom)",
        "safe-l": "env(safe-area-inset-left)",
        "safe-r": "env(safe-area-inset-right)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseRec: {
          "0%,100%": { opacity: "1" },
          "50%": { opacity: "0.35" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.35s cubic-bezier(0.22,1,0.36,1) both",
        "pulse-rec": "pulseRec 1.2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
