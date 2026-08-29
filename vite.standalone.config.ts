/**
 * Standalone build: the whole app as ONE self-contained .html file that runs
 * by double-clicking it — no server, no install, no network.
 *
 * Differences from the normal build: a classic (IIFE) bundle instead of an ES
 * module, because browsers refuse to load module scripts over file://, and no
 * code splitting or separate asset files, because everything is inlined by
 * scripts/inline-standalone.mjs.
 */

import { defineConfig, mergeConfig } from 'vite';
import baseConfig from './vite.config';

export default mergeConfig(
  baseConfig,
  defineConfig({
    build: {
      outDir: 'dist-standalone',
      cssCodeSplit: false,
      assetsInlineLimit: 100_000_000,
      modulePreload: false,
      rollupOptions: {
        output: {
          format: 'iife',
          inlineDynamicImports: true,
          entryFileNames: 'app.js',
          assetFileNames: 'app.[ext]',
        },
      },
    },
  }),
);
