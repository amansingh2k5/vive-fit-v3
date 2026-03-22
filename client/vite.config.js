import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // In local dev, forward /api/* to Express running on :5000
      '/api': {
        target:       'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir:     'dist',
    sourcemap:  false,          // disable in prod — reduces bundle size
    chunkSizeWarningLimit: 800, // suppress large chunk warnings for recharts
    rollupOptions: {
      output: {
        manualChunks: {
          // Split heavy vendor libs into separate chunks for better caching
          'react-vendor':  ['react', 'react-dom', 'react-router-dom'],
          'charts':        ['recharts'],
          'motion':        ['framer-motion'],
          'form':          ['react-hook-form', '@hookform/resolvers', 'zod'],
        },
      },
    },
  },
});
