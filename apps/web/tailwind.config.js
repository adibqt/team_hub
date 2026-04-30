/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,jsx}",
    "./src/components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "ui-serif", "Georgia", "serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      colors: {
        // Editorial palette — warm paper, deep ink, burnt ember
        paper: {
          DEFAULT: "#F5F1E8",   // primary cream background
          50:  "#FBF9F4",
          100: "#F5F1E8",
          200: "#EAE4D5",
          300: "#DDD4BE",
          400: "#C8BC9F",
        },
        ink: {
          DEFAULT: "#0F0F12",
          50:  "#6B6A68",
          100: "#5A5957",
          200: "#3A3937",
          300: "#1F1E20",
          900: "#0F0F12",
        },
        ember: {
          DEFAULT: "#D34F1F",
          50:  "#FBE9DF",
          100: "#F6CDB8",
          200: "#EFAB8A",
          300: "#E78A5F",
          400: "#DD6E3D",
          500: "#D34F1F",
          600: "#B23E14",
          700: "#8C2F0E",
          800: "#5F1F08",
        },
        sage: {
          DEFAULT: "#5A6B52",
          100: "#D7DDD2",
          400: "#7A8C71",
          500: "#5A6B52",
          600: "#465441",
        },
        // Keep `brand` so any non-auth surfaces don't break.
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
      letterSpacing: {
        widest2: "0.18em",
      },
      keyframes: {
        "fade-up": {
          "0%":   { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "rule-grow": {
          "0%":   { transform: "scaleX(0)", transformOrigin: "left" },
          "100%": { transform: "scaleX(1)", transformOrigin: "left" },
        },
        "blink": {
          "0%, 49%":   { opacity: "1" },
          "50%, 100%": { opacity: "0" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.7s cubic-bezier(0.22, 1, 0.36, 1) both",
        "fade-in": "fade-in 0.6s ease-out both",
        "rule-grow": "rule-grow 0.9s cubic-bezier(0.22, 1, 0.36, 1) both",
        "blink": "blink 1.1s steps(1) infinite",
      },
      backgroundImage: {
        "grain": "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 160 160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.45 0'/></filter><rect width='160' height='160' filter='url(%23n)'/></svg>\")",
        "hairline-h": "linear-gradient(to right, currentColor 50%, transparent 50%)",
      },
      backgroundSize: {
        "hair-4": "4px 1px",
      },
    },
  },
  plugins: [],
};
