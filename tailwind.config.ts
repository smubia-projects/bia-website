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
        primary: "#7dd7c2",
        "primary-dim": "#6fc9b5",
        "primary-container": "#44a08d",
        "on-primary": "#00382f",
        "on-primary-container": "#003028",
        secondary: "#7bd1fa",
        "secondary-container": "#00799e",
        "on-secondary-container": "#e9f6ff",
        tertiary: "#e9c400",
        "tertiary-container": "#c9a900",
        surface: "#131313",
        "surface-dim": "#131313",
        "surface-bright": "#393939",
        "surface-container-lowest": "#0e0e0e",
        "surface-container-low": "#1b1b1b",
        "surface-container": "#1f1f1f",
        "surface-container-high": "#2a2a2a",
        "surface-container-highest": "#353535",
        "on-surface": "#e2e2e2",
        "on-surface-variant": "#bdc9c4",
        "outline-variant": "#3e4946",
        outline: "#88938f",
      },
    },
  },
  plugins: [],
};
export default config;
