/* eslint-disable no-undef */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path'
import removeConsole from 'vite-plugin-remove-console';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(),  removeConsole()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'), // Now you can use @ for src/
    }
  },
  server: {
    host: '0.0.0.0',
    port: 3000
  }
})
