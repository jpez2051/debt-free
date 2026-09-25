import { readFile } from 'node:fs/promises'
import { RELEASE_VERSION } from '../src/release.js'

const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
const appSource = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8')

if (!/^\d+\.\d+\.\d+$/.test(packageJson.version) || RELEASE_VERSION !== packageJson.version || !appSource.includes('const VERSION=RELEASE_VERSION')) {
  console.error('Version check failed: the app must display the version from package.json.')
  process.exit(1)
}

console.log(`Version check passed: v${RELEASE_VERSION}`)
