import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { existsSync } from 'fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

// Optional entries: landing.html is not part of the public source export.
const input = { main: resolve(__dirname, 'index.html') };
if (existsSync(resolve(__dirname, 'landing.html'))) {
  input.landing = resolve(__dirname, 'landing.html');
}

// The Code-in-3D window (glyph3d) needs the WebGPU three build — a superset of
// three with WebGPURenderer + TSL node materials. Point BOTH `three` and
// `three/webgpu` at it so there is a single three instance across r3f + the
// glyph3d bindings + core (otherwise instanceof / hook checks across that
// boundary break). Guarded so the app still builds if three isn't installed —
// the 3D window simply won't render.
let threeWebGPU = null;
try { threeWebGPU = require.resolve('three/webgpu'); } catch { /* three not installed */ }

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.IS_PREACT': JSON.stringify('true'),
    'process.env': {},
  },
  resolve: {
    alias: threeWebGPU ? [
      { find: /^three$/, replacement: threeWebGPU },
      { find: /^three\/webgpu$/, replacement: threeWebGPU },
    ] : [],
    dedupe: ['three', 'react', 'react-dom', '@react-three/fiber'],
  },
  optimizeDeps: {
    // glyph3d ships unbundled ESM source with wasm + worker + ?url asset imports;
    // let Vite's plugin pipeline handle those rather than esbuild pre-bundling.
    // @xterm/headless (a @glyph3d/core dep) still needs pre-bundling, though.
    exclude: ['@glyph3d/core', '@glyph3d/r3f'],
    include: ['@xterm/headless/lib-headless/xterm-headless.mjs'],
  },
  build: {
    rollupOptions: {
      input,
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
