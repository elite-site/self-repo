import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Split rarely-changing vendor code out of the app chunk so a content
        // change does not invalidate ~all of the cached dependency bytes.
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          motion: ['framer-motion'],
          vendor: ['axios', 'lucide-react'],
        },
      },
    },
  },
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
