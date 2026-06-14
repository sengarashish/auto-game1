import { defineConfig } from 'vite';

// Base path is configurable for GitHub Pages project sites (e.g. /repo-name/).
// Set BASE_PATH at build time: `BASE_PATH=/auto-game1/ npm run build`.

// The Piper (onnxruntime-web) neural voice uses a threaded WASM build that needs
// SharedArrayBuffer, which browsers only expose in a cross-origin-isolated
// context. These headers enable that for `npm run dev` / `npm run preview`.
// (On static hosts like GitHub Pages these headers aren't set, so Piper falls
// back gracefully to the Web Speech API — see AudioManager.)
const crossOriginIsolation = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
};

export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  server: { headers: crossOriginIsolation },
  preview: { headers: crossOriginIsolation },
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
