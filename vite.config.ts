import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';
  const isAzure = process.env.AZURE_DEPLOYMENT === 'true';

  return {
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [
      react()
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    base: isAzure ? '/app/' : '/', // Azure Web App base path
    build: {
      // Optimize bundle size
      chunkSizeWarningLimit: isAzure ? 250 : 300, // Stricter for Azure
      rollupOptions: {
        output: {
          // Manual chunk splitting for better caching and loading
          manualChunks: {
            // Vendor chunks
            'react-vendor': ['react', 'react-dom'],
            'radix-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-select', '@radix-ui/react-tabs', '@radix-ui/react-toast'],
            'lucide-vendor': ['lucide-react'],
            'query-vendor': ['@tanstack/react-query'],
            'router-vendor': ['react-router-dom'],
            'utils-vendor': ['clsx', 'tailwind-merge', 'class-variance-authority'],
          },
          // Optimize chunk naming for Azure caching
          chunkFileNames: isAzure ? 'assets/[name]-[hash].js' : 'assets/[name].js',
          entryFileNames: isAzure ? 'assets/[name]-[hash].js' : 'assets/[name].js',
          assetFileNames: isAzure ? 'assets/[name]-[hash].[ext]' : 'assets/[name].[ext]',
        },
      },
      // Enable compression and optimization
      cssCodeSplit: true,
      sourcemap: !isProduction, // No sourcemaps in production
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: isProduction, // Remove console logs in production
          drop_debugger: isProduction,
          pure_funcs: isProduction ? ['console.log', 'console.info', 'console.debug'] : [],
        },
        mangle: isProduction,
      },
      // Azure-specific optimizations
      target: isAzure ? 'es2015' : 'esnext',
      assetsInlineLimit: isAzure ? 4096 : 8192, // Lower inline limit for Azure
    },
    // Optimize dependencies
    optimizeDeps: {
      include: ['react', 'react-dom'],
      exclude: ['recharts'], // Exclude charts from bundling unless needed
    },
    // Environment variables
    define: {
      __AZURE_DEPLOYMENT__: isAzure,
      __PRODUCTION__: isProduction,
    },
  };
});
