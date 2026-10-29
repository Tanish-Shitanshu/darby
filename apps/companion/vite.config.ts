import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The companion talks to the server through same-origin paths; Vite proxies them to :4000 (no CORS needed).
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/health': 'http://localhost:4000',
      '/api': 'http://localhost:4000',
      '/ws': { target: 'ws://localhost:4000', ws: true },
    },
  },
});
