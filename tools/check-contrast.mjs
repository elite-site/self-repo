#!/usr/bin/env node
/**
 * Contrast gate.
 *
 * Re-derives every ratio in `shared/tokens.mjs` -> `contrast` from the token
 * values themselves, so the documented table cannot rot into a lie. Exits
 * non-zero on any failure, which makes it usable as a pre-commit or CI check.
 *
 * Usage: node tools/check-contrast.mjs [--verbose]
 */
import { light, dark, contrast } from '../shared/tokens.mjs';

const srgb = (c) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};

function parseColour(input) {
  const s = String(input).trim();
  const hex = s.match(/^#([0-9a-f]{6})$/i);
  if (hex) {
    const n = parseInt(hex[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1];
  }
  const rgb = s.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,/\s]+([\d.]+))?\s*\)$/i);
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3]), rgb[4] === undefined ? 1 : Number(rgb[4])];
  throw new Error(`check-contrast: cannot parse colour "${input}"`);
}

function compositeOn(fg, bg) {
  const a = fg[3];
  return [0, 1, 2].map((i) => fg[i] * a + bg[i] * (1 - a));
}

function luminance(rgb) {
  const [r, g, b] = rgb.map(srgb);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(fgInput, bgInput, under = [255, 255, 255, 1]) {
  const fg = parseColour(fgInput);
  const bg = parseColour(bgInput);
  const flat = bg[3] < 1 ? compositeOn(bg, under) : bg;
  const l1 = luminance(fg[3] < 1 ? compositeOn(fg, flat) : fg);
  const l2 = luminance(flat);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

function resolve(ref) {
  const [themeName, key] = ref.split('.');
  const theme = themeName === 'light' ? light : dark;
  const value = theme[key];
  if (value === undefined) throw new Error(`check-contrast: no token "${ref}"`);
  return value;
}

const verbose = process.argv.includes('--verbose');
let failures = 0;

for (const { fg, bg, min } of contrast) {
  const theme = fg.startsWith('dark.') ? dark : light;
  // A translucent background token is painted on the theme's own surface, not
  // on white. Compositing rgba() over white made every dark-theme tint read as
  // if it sat on a light page and reported nonsense in both directions.
  const under = resolve(theme === dark ? 'dark.surface' : 'light.surface');
  const r = ratio(resolve(fg), resolve(bg), parseColour(under));
  const pass = r >= min;
  if (!pass) failures += 1;
  if (!pass || verbose) {
    const mark = pass ? 'pass' : 'FAIL';
    console.log(
      `  ${mark}  ${fg.padEnd(22)} on ${bg.padEnd(22)} = ${r.toFixed(2)}:1 (min ${min}:1)`,
    );
  }
}

if (failures > 0) {
  console.error(`\ncheck-contrast: ${failures} of ${contrast.length} pairs below their floor.`);
  process.exit(1);
}
console.log(`check-contrast: all ${contrast.length} pairs pass WCAG AA.`);
