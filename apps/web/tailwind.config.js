/** @type {import('tailwindcss').Config} */
const withVar = (name) => `rgb(var(${name}) / <alpha-value>)`;

module.exports = {
  darkMode: "class",
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
        // Editorial palette, driven by CSS variables so the same Tailwind
        // class (`bg-paper`, `text-ink`, …) flips cleanly between the light
        // and dark themes. RGB triplets live in globals.css.
        paper: {
          DEFAULT: withVar("--color-paper"),
          50:  withVar("--color-paper-50"),
          100: withVar("--color-paper-100"),
          200: withVar("--color-paper-200"),
          300: withVar("--color-paper-300"),
          400: withVar("--color-paper-400"),
        },
        ink: {
          DEFAULT: withVar("--color-ink"),
          50:  withVar("--color-ink-50"),
          100: withVar("--color-ink-100"),
          200: withVar("--color-ink-200"),
          300: withVar("--color-ink-300"),
          900: withVar("--color-ink-900"),
        },
        ember: {
          DEFAULT: withVar("--color-ember"),
          50:  withVar("--color-ember-50"),
          100: withVar("--color-ember-100"),
          200: withVar("--color-ember-200"),
          300: withVar("--color-ember-300"),
          400: withVar("--color-ember-400"),
          500: withVar("--color-ember-500"),
          600: withVar("--color-ember-600"),
          700: withVar("--color-ember-700"),
          800: withVar("--color-ember-800"),
        },
        sage: {
          DEFAULT: withVar("--color-sage"),
          100: withVar("--color-sage-100"),
          400: withVar("--color-sage-400"),
          500: withVar("--color-sage-500"),
          600: withVar("--color-sage-600"),
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
