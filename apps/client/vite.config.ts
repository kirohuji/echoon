import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

const PORT = 8081;

export default defineConfig({
  base: '',
  plugins: [tailwindcss()],
  server: { port: PORT, host: true },
  preview: { port: PORT, host: true },
});

