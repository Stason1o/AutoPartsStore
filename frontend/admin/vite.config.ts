import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5180,
    proxy: {
      '/api': {
        // адрес бэкенда можно переопределить: VITE_API_TARGET=http://localhost:8090
        target: process.env.VITE_API_TARGET ?? 'http://localhost:8090',
        changeOrigin: false,
      },
    },
  },
});
