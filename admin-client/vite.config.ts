import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: '/admin/',
  build: {
    outDir: path.resolve(__dirname, '../public/admin'),
    emptyOutDir: true,
  },
  server: {
    port: 5175,
    proxy: {
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
