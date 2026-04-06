import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['src/assets/*.png', 'src/assets/*.svg'],
      manifest: {
        name: '世界頭條 News',
        short_name: '世界頭條',
        description: '即時全球新聞，多語言翻譯',
        theme_color: '#1a1a2e',
        background_color: '#f5f6fa',
        display: 'standalone',
        icons: [
          { src: 'src/assets/hero.png', sizes: '192x192', type: 'image/png' },
          { src: 'src/assets/hero.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/newsdata\.io\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'newsdata-cache', expiration: { maxEntries: 50, maxAgeSeconds: 600 } },
          },
          {
            urlPattern: /^https:\/\/newsgoogle\.com\/.*/i,
            handler: 'NetworkFirst',
            options: { cacheName: 'gn-cache', expiration: { maxEntries: 30, maxAgeSeconds: 300 } },
          },
          {
            urlPattern: /^https:\/\/picsum\.photos\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'img-cache', expiration: { maxEntries: 100, maxAgeSeconds: 86400 } },
          },
        ],
      },
    }),
  ],
  base: './',
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
  },
})
