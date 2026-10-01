/**
 * The admin client's Tailwind config.
 *
 * This was ~140 lines and an almost verbatim copy of web's, minus three
 * sections it had silently lost. Both are now three lines over one shared
 * source, which is what finally makes one dark palette apply to both apps.
 *
 * Colours, type, radius, motion and layers all come from `shared/`. See
 * `shared/tailwind-preset.mjs` for the token contract and
 * `shared/tokens.mjs` for the palette.
 *
 * @type {import('tailwindcss').Config}
 */
import { eliteTheme } from '../shared/tailwind-preset.mjs';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  // `class` is retained so the existing `.dark` toggle in `ThemeContext`
  // keeps working while the admin pages are migrated off `!important`
  // overrides and onto semantic tokens.
  darkMode: ['class', '[data-theme="dark"]'],
  theme: eliteTheme,
  plugins: [],
};
