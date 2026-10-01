import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
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
    },
  },
});
