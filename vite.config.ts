import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Vital for Capacitor: Makes paths relative (./assets) instead of absolute (/assets)
  base: './', 
  build: {
    outDir: 'dist',
    sourcemap: false
  }
});