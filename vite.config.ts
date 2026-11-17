import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        game: resolve(import.meta.dirname, 'index.html'),
        layoutPreview: resolve(import.meta.dirname, 'layout-preview.html'),
      },
    },
  },
});
