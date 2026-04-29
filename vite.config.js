import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isProduction = mode === 'production';
  const isAzure = env.AZURE_DEPLOYMENT === 'true';

  return {
    server: {
      host: "::",
      port: 8080,
      cors: true,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    },
    plugins: [react()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    base: '/',
    build: {
      chunkSizeWarningLimit: isAzure ? 250 : 300,
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom'],
            'radix-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-select', '@radix-ui/react-tabs', '@radix-ui/react-toast'],
            'lucide-vendor': ['lucide-react'],
            'query-vendor': ['@tanstack/react-query'],
            'router-vendor': ['react-router-dom'],
            'utils-vendor': ['clsx', 'tailwind-merge', 'class-variance-authority'],
          },
          chunkFileNames: isAzure ? 'assets/[name]-[hash].js' : 'assets/[name].js',
          entryFileNames: isAzure ? 'assets/[name]-[hash].js' : 'assets/[name].js',
          assetFileNames: isAzure ? 'assets/[name]-[hash].[ext]' : 'assets/[name].[ext]',
        },
      },
      cssCodeSplit: true,
      sourcemap: !isProduction,
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: isProduction,
          drop_debugger: isProduction,
          pure_funcs: isProduction ? ['console.log', 'console.info', 'console.debug'] : [],
        },
        mangle: isProduction,
      },
      target: isAzure ? 'es2015' : 'esnext',
      assetsInlineLimit: isAzure ? 4096 : 8192,
    },
    optimizeDeps: {
      include: ['react', 'react-dom'],
      exclude: ['recharts'],
    },
    define: {
      __AZURE_DEPLOYMENT__: isAzure,
      __PRODUCTION__: isProduction,
    },
  };
});
