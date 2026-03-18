import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      }
    },
    build: {
      sourcemap: false,
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          chunkFileNames: 'assets/[name]-[hash].js',
          entryFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]',
          // Simpler chunk strategy to avoid circular dependencies
          manualChunks(id) {
            if (id.includes('node_modules')) {
              // Split large libraries separately
              if (id.includes('recharts')) {
                return 'charts-vendor';
              }
              if (id.includes('@supabase')) {
                return 'supabase-vendor';
              }
              // Group remaining vendor libs
              return 'vendor';
            }
          },
        },
      },
      minify: 'esbuild',
      target: 'es2020',
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'swr', '@supabase/supabase-js'],
    },
    css: {
      devSourcemap: true,
    },
  };
});
