import { defineConfig } from 'vite'
import legacy from '@vitejs/plugin-legacy'
import { resolve } from 'path'

export default defineConfig({
  // Multi-page app configuration
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        feeds: resolve(__dirname, 'feeds.html'),
        share: resolve(__dirname, 'share.html'),
        donate: resolve(__dirname, 'donate.html'),
        leaderboard: resolve(__dirname, 'leaderboard.html'),
        privacy: resolve(__dirname, 'privacy-policy.html'),
        terms: resolve(__dirname, 'terms-and-conditions.html'),
        notfound: resolve(__dirname, '404.html')
      }
    },
    // Minification settings
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log in production
        drop_debugger: true
      }
    },
    // CSS minification
    cssMinify: true,
    // Generate source maps for debugging
    sourcemap: true,
    // Output directory
    outDir: 'dist',
    // Clear output directory before build
    emptyOutDir: true,
    // Asset optimization
    assetsDir: 'assets',
    // Chunk size warning limit
    chunkSizeWarningLimit: 1000
  },
  
  // Development server configuration
  server: {
    port: 3000,
    open: true,
    host: true, // Allow external connections
    // Proxy API calls to maintain compatibility
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path
      }
    }
  },
  
  // Preview server configuration
  preview: {
    port: 4173,
    host: true
  },
  
  // Plugin configuration
  plugins: [
    // Legacy browser support
    legacy({
      targets: ['defaults', 'not IE 11']
    })
  ],
  
  // Base URL configuration
  base: './',
  
  // Asset handling
  assetsInclude: ['**/*.png', '**/*.jpg', '**/*.jpeg', '**/*.gif', '**/*.svg', '**/*.webp'],
  
  // CSS configuration
  css: {
    // Enable CSS source maps
    devSourcemap: true
  },
  
  // Define global constants
  define: {
    __DEV__: JSON.stringify(process.env.NODE_ENV === 'development')
  },
  
  // Optimization settings
  optimizeDeps: {
    include: [
      'micromodal',
      'alpinejs'
    ]
  }
})