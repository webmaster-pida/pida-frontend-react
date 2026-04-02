import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    // Inyectamos la llave directamente como un string global
    'import.meta.env.VITE_MICROLINK_KEY': JSON.stringify('F4jGFCR2Ur9PZzezxRnOf4ohHBhOXVTX3ccK3Sla')
  },
  build: {
    sourcemap: false,
    minify: 'esbuild',
  }
})