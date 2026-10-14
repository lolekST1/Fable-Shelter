import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: { output: { entryFileNames: 'assets/game.js', assetFileNames: 'assets/[name][extname]' } },
  },
});
