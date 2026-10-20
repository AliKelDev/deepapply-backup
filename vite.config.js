import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const path = id.replace(/\\/g, '/')
          // Shared generated helpers must not pull PDF code into the entry.
          if (path.includes('vite/preload-helper')) return 'runtime'
          if (path.includes('commonjsHelpers')) return 'react'
          if (!path.includes('/node_modules/')) return
          const name = path.split('/node_modules/').pop().split('/')[0]
          if (['react', 'react-dom', 'react-router', 'react-router-dom', 'scheduler'].includes(name)) return 'react'
          if (['framer-motion', 'motion-dom', 'motion-utils'].includes(name)) return 'motion'
          // Together these exceed 500 kB; both remain deferred to ResultsPage.
          if (name === 'jspdf') return 'pdf'
          if (name === 'html2canvas') return 'pdf-canvas'
          if (name === 'lucide-react') return 'icons'
          if (name === 'react-markdown' || /^(remark|rehype|unified|micromark|mdast|hast|unist|vfile)(-|$)/.test(name)) return 'markdown'
        },
      },
    },
  },
})
