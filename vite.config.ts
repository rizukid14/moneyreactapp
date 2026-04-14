import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'Money Tracker PWA',
        short_name: 'MoneyApp',
        description: 'Track your expenses and incomes easily',
        theme_color: '#f97316',
        start_url: '/',
        icons: [
          {
            src: 'favicon.svg',
            sizes: '192x192 512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ],
        display: 'standalone',
        background_color: '#ffffff',
      }
    })
  ],
  optimizeDeps: {
    include: [
      '@paddlejs/paddlejs-core',
      '@paddlejs/paddlejs-backend-webgl',
      '@paddlejs-models/ocr',
    ],
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-recharts': ['recharts'],
          'vendor-paddle': [
            '@paddlejs/paddlejs-core', 
            '@paddlejs/paddlejs-backend-webgl', 
            '@paddlejs-models/ocr'
          ],
        }
      }
    },
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
})
