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
      includeAssets: ['favicon.png', 'logo192.png', 'logo512.png'],
      manifest: {
        name: 'Ludothèque de Coligny',
        short_name: 'LudoColigny',
        description: 'Application de gestion de ludothèque associative',
        theme_color: '#1a5f7a',
        background_color: '#fdfaf6',
        display: 'standalone',
        icons: [
          {
            src: 'logo192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'logo512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        // Cette option permet de mettre en cache tous les fichiers JS/CSS générés
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
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