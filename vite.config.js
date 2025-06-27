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
      },
      output: {
        // Optimize chunk splitting for preloading system
        manualChunks: {
          // Core system chunks
          'core': ['./js/core/StateManager.js', './js/core/CacheManager.js'],

          // API and preloading chunks (lazy-loaded)
          'preloader': ['./js/modules/api-preloader.js', './js/modules/api-integration.js'],

          // Feature-specific chunks
          'social': ['./js/modules/social.js'],
          'gamification': ['./js/modules/leaderboard.js', './js/modules/share-features.js'],

          // Utility chunks
          'utils': [
            './js/utils/feature-flags.js',
            './js/utils/include-nav.js',
            './js/modules/referral-utils.js'
          ],

          // Vendor chunks
          'vendor': ['micromodal']
        },
        // Optimize chunk file names
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId
            ? chunkInfo.facadeModuleId.split('/').pop().replace('.js', '')
            : 'chunk';
          return `assets/js/[name]-[hash].js`;
        },
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          if (/\.(css)$/.test(assetInfo.name)) {
            return `assets/css/[name]-[hash][extname]`;
          }
          if (/\.(png|jpe?g|svg|gif|tiff|bmp|ico|webp)$/i.test(assetInfo.name)) {
            return `assets/images/[name]-[hash][extname]`;
          }
          return `assets/[ext]/[name]-[hash][extname]`;
        }
      },
      // Enable tree shaking
      treeshake: {
        moduleSideEffects: false,
        preset: 'recommended'
      }
    },
    // Minification settings
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: process.env.NODE_ENV === 'production', // Keep console.log in dev
        drop_debugger: true,
        pure_funcs: ['console.info', 'console.debug'], // Remove specific console methods
        passes: 2 // Multiple compression passes for better optimization
      },
      mangle: {
        // Preserve function names for better debugging
        keep_fnames: process.env.NODE_ENV === 'development'
      },
      format: {
        comments: false // Remove comments in production
      }
    },
    // CSS minification
    cssMinify: true,
    // Generate source maps only in development
    sourcemap: process.env.NODE_ENV === 'development',
    // Output directory
    outDir: 'dist',
    // Clear output directory before build
    emptyOutDir: true,
    // Asset optimization
    assetsDir: 'assets',
    // Chunk size warning limit (increased for preloading modules)
    chunkSizeWarningLimit: 1500
  },

  // Development server configuration
  server: {
    port: 5173,
    open: true,
    host: true, // Allow external connections
    // Proxy API calls to maintain compatibility
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        // rewrite: (path) => path
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

  // Public directory (will be copied to dist root)
  publicDir: 'public',

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
  }
})