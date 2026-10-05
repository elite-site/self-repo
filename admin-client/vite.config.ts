import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: '/admin/',
  build: {
    outDir: path.resolve(__dirname, '../backend/public/admin'),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        // Keep rarely-changing vendor code in its own long-lived chunk so an
        // admin UI change does not invalidate the whole ~350 kB bundle.
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
  server: {
    port: 5175,
    fs: {
      // `shared/tokens.css` lives at the repo root, outside this Vite root.
      // Serving it needs explicit permission; without this the dev server
      // returns 403 on the token stylesheet and the page renders unstyled.
      allow: ['..'],
    },
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
      '/admin/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
      '/admin/login': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
      '/admin/logout': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
      '/admin/me': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
    },
  },
});
