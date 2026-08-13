import { defineConfig } from 'vite'
import { transformAppV054 } from './scripts/v054-app-transform.js'

export default defineConfig({
  base: '/debt-free/',
  plugins: [{
    name: 'debt-free-v054',
    enforce: 'pre',
    transform(code, id) {
      if (id.endsWith('/src/App.jsx')) return transformAppV054(code)
      return null
    },
  }],
})
