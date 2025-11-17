import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    port: 5173,
    strictPort: true,
    host: true
  },
  preview: {
    port: 5173,
    strictPort: true,
    host: true
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        // Ensure consistent hashing for cache busting
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    }
  },
  plugins: [
    {
      name: 'html-no-cache',
      configurePreviewServer(server) {
        return () => {
          server.middlewares.use((req, res, next) => {
            // Only apply no-cache headers to HTML files
            if (req.url === '/' || req.url.endsWith('.html')) {
              res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
              res.setHeader('Pragma', 'no-cache')
              res.setHeader('Expires', '0')
            }
            next()
          })
        }
      }
    }
  ]
})
