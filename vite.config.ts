import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    exclude: ['jsonwebtoken', 'bcryptjs', 'speakeasy', 'qrcode', '@prisma/client']
  },
  build: {
    rollupOptions: {
      external: ['jsonwebtoken', 'bcryptjs', 'speakeasy', 'qrcode', '@prisma/client']
    }
  }
})
