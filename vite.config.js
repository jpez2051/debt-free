import { defineConfig } from 'vite'
import { transformAppV054 } from './scripts/v054-app-transform.js'
import { transformAppV055 } from './scripts/v055-app-transform.js'
import { transformAppV056 } from './scripts/v056-app-transform.js'
import { transformAppV057 } from './scripts/v057-app-transform.js'
import { transformAppV058 } from './scripts/v058-app-transform.js'

export default defineConfig({
  base: '/debt-free/',
  plugins: [{
    name: 'debt-free-release-transform',
    enforce: 'pre',
    transform(code, id) {
      if (!id.endsWith('/src/App.jsx')) return null
      return transformAppV058(transformAppV057(transformAppV056(transformAppV055(transformAppV054(code)))))
    },
  }],
})
