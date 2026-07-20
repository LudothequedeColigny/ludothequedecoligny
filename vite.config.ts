import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { VitePWA } from 'vite-plugin-pwa'

// Configuration Vite pour LudoVillage optimisée avec mode Hors-ligne
export default defineConfig({
  plugins: [
    react(),
    // Activation de la Progressive Web App
    VitePWA({
      registerType: 'autoUpdate',
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
      },
      includeAssets: ['logo-feuille.svg'],
      manifest: {
        name: 'Ludothèque de Coligny',
        short_name: 'LudoColigny',
        description: 'Application de gestion de ludothèque associative',
        theme_color: '#0f3d4f',
        background_color: '#0f3d4f',
        display: 'standalone',
        icons: [
          { src: '/icon-72.png', sizes: '72x72', type: 'image/png' },
          { src: '/icon-96.png', sizes: '96x96', type: 'image/png' },
          { src: '/icon-128.png', sizes: '128x128', type: 'image/png' },
          { src: '/icon-144.png', sizes: '144x144', type: 'image/png' },
          { src: '/icon-152.png', sizes: '152x152', type: 'image/png' },
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-384.png', sizes: '384x384', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ]
      }
    })
  ],
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@services': path.resolve(__dirname, './src/services'),
      '@types': path.resolve(__dirname, './src/types'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@pages': path.resolve(__dirname, './src/pages'),
    },
  },

  server: {
    port: 5173,
    open: true,
    proxy: {
      '/bgg': {
        target: 'https://boardgamegeek.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/bgg/, '/xmlapi2'),
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'text/xml,application/xml,*/*',
          'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
          'Referer': 'https://boardgamegeek.com/'
        }
      }
    }
  },

  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['lucide-react'],
          'form-vendor': ['react-hook-form', 'zod', '@hookform/resolvers'],
        },
      },
    },
  },

  optimizeDeps: {
    include: ['react', 'react-dom', '@supabase/supabase-js'],
  },
})