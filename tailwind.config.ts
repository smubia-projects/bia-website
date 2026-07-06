import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        bg: "var(--bg)",
        surface: "var(--surface)",
        "surface-muted": "var(--surface-muted)",
        ink: "var(--ink)",
        "ink-soft": "var(--ink-soft)",
        "ink-faint": "var(--ink-faint)",
        line: "var(--border)",
        pine: {
          DEFAULT: "var(--pine-deep)",
          surface: "var(--pine-surface)",
          border: "var(--pine-border)",
          text: "var(--pine-text)",
          soft: "var(--pine-text-soft)",
        },
        mint: "var(--mint)",
        emerald: {
          DEFAULT: "var(--emerald)",
          strong: "var(--emerald-strong)",
        },
        teal: {
          DEFAULT: "var(--teal)",
          mid: "var(--teal-mid)",
          deep: "var(--teal-deep)",
        },
        sand: "var(--sand)",
        dusk: {
          DEFAULT: "var(--dusk)",
          deep: "var(--dusk-deep)",
          surface: "var(--dusk-surface)",
          border: "var(--dusk-border)",
          text: "var(--dusk-text)",
          soft: "var(--dusk-text-soft)",
        },
        amber: {
          DEFAULT: "var(--amber)",
        },
        sky: "var(--sky)",
        gold: {
          DEFAULT: "var(--gold)",
          deep: "var(--gold-deep)",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-roboto-mono)", "monospace"],
      },
      boxShadow: {
        xs: "var(--shadow-xs)",
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
      },
    },
  },
  plugins: [],
};
export default config;
