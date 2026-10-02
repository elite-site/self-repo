/**
 * The student/public portal's Tailwind config.
 *
 * This was ~140 lines and an almost verbatim copy of admin-client's, which had
 * already drifted (admin had lost the `spacing`, `boxShadow` and `maxWidth`
 * blocks). Both are now three lines over one shared source.
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
  // `data-theme` is the token-driven switch and `class` stays enabled alongside
  // it because `shared/tokens.css` keeps a `.dark` alias on the same block, so
  // any surviving `dark:` utility still resolves. Both are applied together by
  // `web/src/lib/theme.ts`; there is no third mechanism, and nothing strips
  // either one at runtime.
  darkMode: ['class', '[data-theme="dark"]'],
  theme: eliteTheme,
  plugins: [],
};
