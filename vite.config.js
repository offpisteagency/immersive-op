import { defineConfig } from 'vite';
import { resolve } from 'path';

// Get build target from environment or default to 'all'
const buildTarget = process.env.BUILD_TARGET || 'all';

// Configuration for different build targets
const buildConfigs = {
  // Original 3D logo background
  immersive: {
    lib: {
      entry: resolve(__dirname, 'src/main.js'),
      name: 'ImmersiveBG',
      fileName: 'immersive-bg',
      formats: ['iife']
    },
    rollupOptions: {
      output: {
        entryFileNames: 'immersive-bg.min.js',
        inlineDynamicImports: true
      }
    }
  },
  // Interactive spotlight background
  spotlight: {
    lib: {
      entry: resolve(__dirname, 'src/main-spotlight.js'),
      name: 'SpotlightBG',
      fileName: 'spotlight-bg',
      formats: ['iife']
    },
    rollupOptions: {
      output: {
        entryFileNames: 'spotlight-bg.min.js',
        inlineDynamicImports: true
      }
    }
  }
};

// Select build config based on target
function getBuildConfig() {
  if (buildTarget === 'spotlight') {
    return buildConfigs.spotlight;
  }
  // Default to immersive (original)
  return buildConfigs.immersive;
}

export default defineConfig({
  build: {
    ...getBuildConfig(),
    outDir: 'dist',
    minify: 'esbuild',
    emptyOutDir: false  // Don't clear dist folder between builds
  },
  server: {
    port: 3000,
    open: true
  }
});

