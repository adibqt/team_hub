/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,jsx}",
    "./src/components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        brand: {
          50:  "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
          950: "#1e1b4b",
        },
      },
      keyframes: {
        "blob-drift": {
          "0%, 100%":  { transform: "translate(0, 0) scale(1)" },
          "33%":       { transform: "translate(40px, -50px) scale(1.1)" },
          "66%":       { transform: "translate(-30px, 30px) scale(0.95)" },
        },
        "fade-up": {
          "0%":   { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "shimmer": {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "blob-1":  "blob-drift 18s ease-in-out infinite",
        "blob-2":  "blob-drift 22s ease-in-out infinite reverse",
        "blob-3":  "blob-drift 26s ease-in-out infinite",
        "fade-up": "fade-up 0.5s ease-out both",
        "shimmer": "shimmer 2.5s linear infinite",
      },
      backgroundImage: {
        "grid-faint": "radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)",
      },
      backgroundSize: {
        "grid-24": "24px 24px",
      },
    },
  },
  plugins: [],
};
