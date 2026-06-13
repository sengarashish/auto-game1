import { defineConfig } from 'vite';

// Base path is configurable for GitHub Pages project sites (e.g. /repo-name/).
// Set BASE_PATH at build time: `BASE_PATH=/auto-game1/ npm run build`.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1500,
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
