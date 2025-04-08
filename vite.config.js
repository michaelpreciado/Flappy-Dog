import { defineConfig } from 'vite';
import viteCompression from 'vite-plugin-compression';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // Project root directory (where index.html is)
  root: 'src',

  // Base public path for assets (use relative for Netlify compatibility)
  base: './',

  // Directory relative to root where static assets are located
  publicDir: '../public',

  build: {
    // Output directory relative to project root
    outDir: '../dist',
    // Empty output directory before building
    emptyOutDir: true, 
    // Minification is 'esbuild' by default, which is fast.
    // 'terser' is slower but can result in smaller bundles.
    // minify: 'terser', 
    // terserOptions: { 
    //   compress: {
    //     drop_console: true, // Remove console logs in production
    //   },
    // },
    rollupOptions: {
      // Additional Rollup options if needed
    },
  },

  plugins: [
    // Pre-compression using Gzip and Brotli
    viteCompression({
      verbose: true,
      disable: false,
      threshold: 10240, // Only compress files larger than 10kb
      algorithm: 'gzip',
      ext: '.gz',
    }),
    viteCompression({
      verbose: true,
      disable: false,
      threshold: 10240,
      algorithm: 'brotliCompress',
      ext: '.br',
    }),

    // PWA Plugin Configuration
    VitePWA({
      // Automatically register the service worker
      registerType: 'autoUpdate',
      // Cache external assets (like Google Fonts)
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,jpg,svg,webp}'], // Files to precache
        runtimeCaching: [
          {
            // Cache Google Fonts stylesheets with a stale-while-revalidate strategy.
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-stylesheets',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // <== 365 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            // Cache the underlying font files with a cache-first strategy forever.
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // <== 365 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              },
            }
          }
        ]
      },
      // Manifest options
      manifest: {
        name: 'Flappy Dog Game',
        short_name: 'FlappyDog',
        description: 'A fun Flappy Bird style game with pixel art dogs!',
        theme_color: '#5c94fc',
        background_color: '#000000',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          // Define your icons here (paths relative to publicDir or project root)
          {
            src: 'assets/icons/icon-192x192.png', // Assuming icons are moved to src/assets/icons
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'assets/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'assets/icons/icon-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      }
    })
  ]
}); 