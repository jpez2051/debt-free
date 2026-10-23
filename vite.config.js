import { defineConfig } from 'vite'
import { RELEASE_VERSION } from './src/release.js'

export default defineConfig({
  base: '/debt-free/',
  plugins:[{name:'release-splash',transformIndexHtml:html=>html.replaceAll('__DEBT_FREE_VERSION__',RELEASE_VERSION)}],
})
