/**
 * Polyfills for Paddle.js and its dependencies
 * Paddle.js (and its Emscripten/Wasm modules) expect various global variables
 * that are not present in a modern ESM/Vite browser environment.
 */

if (typeof window !== 'undefined') {
  // @ts-ignore
  window.global = window;
  
  // @ts-ignore
  window.process = window.process || {
    env: { NODE_ENV: 'development' },
    version: '',
    nextTick: (cb: Function) => setTimeout(cb, 0)
  };

  // Paddle.js / Emscripten WASM requirement
  // @ts-ignore
  window.Module = window.Module || {};
}

export {};
