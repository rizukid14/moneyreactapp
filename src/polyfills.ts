/**
 * Polyfills for Paddle.js and its dependencies.
 * This file MUST be the first import in main.tsx.
 *
 * Paddle.js (an older library) expects several Node.js / Emscripten
 * globals that don't exist in a modern Vite/ESM browser environment.
 * We shim them here before any Paddle code loads.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
if (typeof window !== 'undefined') {
  // Node.js global shim
  (window as any).global = window;

  // Node.js process shim
  if (!(window as any).process) {
    (window as any).process = {
      env: { NODE_ENV: 'development' },
      version: '',
      nextTick: (cb: (...args: any[]) => void) => setTimeout(cb, 0),
    };
  }

  // Emscripten Module shim (used by WASM-compiled backends)
  if (!(window as any).Module) {
    (window as any).Module = {};
  }

  // @paddlejs-models/ocr reads window.paddlejs to find the registered core.
  // Without this stub, it crashes immediately with:
  //   "Cannot read properties of undefined (reading 'paddlejs')"
  if (!(window as any).paddlejs) {
    (window as any).paddlejs = {};
  }
}

export {};
