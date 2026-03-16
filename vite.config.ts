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
    // Build optimizations (Vercel React Best Practices)
    build: {
      // 生产环境关闭 source maps，防止源码泄露
      sourcemap: false,
      // Chunk splitting for better caching
      rollupOptions: {
        output: {
          manualChunks: {
            // Separate vendor chunks for better caching
            'react-vendor': ['react', 'react-dom'],
            'supabase-vendor': ['@supabase/supabase-js'],
            'swr-vendor': ['swr'],
            // UI libraries
            'ui-vendor': ['lucide-react'],
          },
        },
      },
      // Minification settings
      minify: 'esbuild',
      // Target modern browsers for smaller bundles
      target: 'es2020',
    },
    // Optimize dependencies
    optimizeDeps: {
      include: ['react', 'react-dom', 'swr', '@supabase/supabase-js'],
      // Force pre-bundling for better dev performance
      force: false,
    },
    // Enable CSS code splitting
    css: {
      devSourcemap: true,
    },
  };
});
