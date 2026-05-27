import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    build: { outDir: 'out/main' }
  },
  preload: {
    // Sandboxed preloads must be CommonJS; emit .cjs (project is "type": "module").
    build: {
      outDir: 'out/preload',
      rollupOptions: { output: { format: 'cjs', entryFileNames: 'index.cjs' } }
    }
  },
  renderer: {
    root: 'src/renderer',
    resolve: {
      alias: { '@shared': resolve('src/shared') }
    },
    build: {
      outDir: 'out/renderer',
      rollupOptions: { input: { index: resolve('src/renderer/index.html') } }
    },
    plugins: [react()]
  }
})
