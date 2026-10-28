import { rmSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vite';

/** `npm run build:poki`: the build for Poki (dist-poki/). The Poki SDK is always on there (see platform.ts), and
 *  what belongs to our own site goes: the offline service worker, the app manifest and the "prototype" label. */
const forPoki = (): Plugin => ({
  name: 'fable-shelter-poki',
  apply: 'build',
  // public/ is copied as is, so the worker and the manifest have to be removed from the output by hand
  closeBundle() {
    for (const f of ['sw.js', 'manifest.webmanifest']) rmSync(`dist-poki/${f}`, { force: true });
  },
  transformIndexHtml: (html) => html
    .replace(/\s*<script>if \('serviceWorker'[^<]*<\/script>/, '')
    .replace(/\s*<link rel="manifest"[^>]*>/, '')
    .replace(/\s*<div id="ver">[^<]*<\/div>/, ''),
});

export default defineConfig(({ mode }) => ({
  base: './',
  plugins: mode === 'poki' ? [forPoki()] : [],
  build: {
    outDir: mode === 'poki' ? 'dist-poki' : 'dist',
    chunkSizeWarningLimit: 900,
    rollupOptions: { output: { entryFileNames: 'assets/game.js', assetFileNames: 'assets/[name][extname]' } },
  },
}));
