// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Tailwind Configuration (Phase 8)
// NOTE: Tailwind CSS v4 uses @theme inline in globals.css.
// This config is kept minimal for plugin support only.
// All design tokens are defined in globals.css using CSS custom properties.
// ══════════════════════════════════════════════════════════════════

import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  plugins: [tailwindcssAnimate],
};

export default config;
