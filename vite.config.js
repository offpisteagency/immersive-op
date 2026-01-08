import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/main.js'),
      name: 'ImmersiveBG',
      fileName: 'immersive-bg',
      formats: ['iife']
    },
    outDir: 'dist',
    minify: 'esbuild',
    rollupOptions: {
      output: {
        entryFileNames: 'immersive-bg.min.js',
        inlineDynamicImports: true
      }
    }
  },
  server: {
    port: 3000,
    open: true
  }
});

