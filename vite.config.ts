import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(({mode}) => {
  return {
    // Base path for GitHub Pages - change 'fuzzy-cognitive-mapper' to your repo name
    base: mode === 'production' ? '/fuzzy-cognitive-mapper/' : '/',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 3000,
      host: true,
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    preview: {
      port: 3000,
      host: true,
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      minify: 'esbuild',
      rollupOptions: {
        output: {
          // Function form so every module of a package (including internals
          // like react/jsx-runtime) lands in the intended chunk; the object
          // form previously produced an empty "vendor" chunk.
          manualChunks(id: string) {
            if (!id.includes('node_modules')) return undefined;
            if (id.includes('recharts') || id.includes('/d3-') || id.includes('victory')) {
              return 'charts';
            }
            if (id.includes('@xyflow') || id.includes('dagre')) {
              return 'flow';
            }
            if (id.includes('lucide-react') || id.includes('motion')) {
              return 'ui';
            }
            return 'vendor';
          },
        },
      },
    },
  };
});
