import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    sourcemap: false, // Oculta el código original en producción
    minify: 'esbuild', // Tritura y comprime el código al máximo
  }
})