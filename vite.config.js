import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      registerType: 'autoUpdate',

      injectManifest: {
        swSrc: 'src/sw.js',
        swDest: 'dist/sw.js',
        // Increase size limit for precache assets
        maximumFileSizeToCacheInBytes: 3000000,
      },

      manifest: {
        name: 'QuickTask PWA',
        short_name: 'QuickTask',
        description: 'An offline-first task manager PWA',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#030712',
        theme_color: '#6366f1',
        orientation: 'portrait',
        categories: ['productivity', 'utilities'],
        icons: [
        {
          src: '/icons/icon-192x192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any'
        },
        {
          src: '/icons/icon-192x192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'maskable'
        },
        {
          src: '/icons/icon-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any'
        },
        {
          src: '/icons/icon-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable'
        }
        ],
        screenshots: [
  {
    "src": "/icons/icon-512x512.png",
    "sizes": "512x512",
    "type": "image/png",
    "form_factor": "wide"
  },
  {
    "src": "/icons/icon-512x512.png",
    "sizes": "512x512",
    "type": "image/png",
    "form_factor": "narrow"
  }
]
      },

      devOptions: {
        enabled: true,
        type: 'module',
      }
    })
  ],

  build: {
    // Generate source maps for debugging
    sourcemap: false,
    rollupOptions: {
      output: {
        // Split chunks for better caching
        manualChunks: {
          firebase: ['firebase/app', 'firebase/messaging'],
          vendor: ['react', 'react-dom'],
        }
      }
    }
  }
})