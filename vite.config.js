import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'esnext',  
  },
  server: {
    target: 'esnext',
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'esnext',
    }
  },
});

