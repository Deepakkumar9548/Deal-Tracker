import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  // Root is now the directory containing index.html
  root: path.resolve(__dirname, './'), 
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
