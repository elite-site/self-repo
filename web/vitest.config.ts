/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    // Playwright's e2e specs live outside src/ and need real browsers, so they
    // are deliberately excluded here.
    exclude: ['node_modules/**', 'dist/**', 'tests/**'],
  },
});
