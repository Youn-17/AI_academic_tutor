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
    // Build optimizations - Vercel React Best Practices
    build: {
      // 生产环境关闭 source maps，防止源码泄露
      sourcemap: false,
      // Increase chunk size warning limit
      chunkSizeWarningLimit: 500,
      // Chunk splitting for better caching
      rollupOptions: {
        output: {
          // Optimize chunk file names for better caching
          chunkFileNames: 'assets/[name]-[hash].js',
          entryFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]',
          // Function-based manual chunks for better control
          manualChunks(id) {
          // node_modules package splitting
          if (id.includes('node_modules')) {
            // React ecosystem
            if (id.includes('react') || id.includes('react-dom') || id.includes('scheduler')) {
              return 'react-vendor';
            }
            // Supabase
            if (id.includes('@supabase')) {
              return 'supabase-vendor';
            }
            // SWR data fetching
            if (id.includes('swr')) {
              return 'swr-vendor';
            }
            // Charts library (large, keep separate)
            if (id.includes('recharts') || id.includes('d3-shape') || id.includes('d3-scale') || id.includes('d3-time-format')) {
              return 'charts-vendor';
            }
            // Markdown
            if (id.includes('react-markdown') || id.includes('vfile') || id.includes('unist') || id.includes('mdast')) {
              return 'markdown-vendor';
            }
            // Icons (lucide-react is tree-shakeable but large)
            if (id.includes('lucide-react')) {
              return 'icons-vendor';
            }
            // Everything else in node_modules
            return 'vendor';
          }
          },
        },
      },
      // Minification settings - use terser for better compression
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true,
          pure_funcs: ['console.log'],
        },
      },
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
