import { readFile } from 'node:fs/promises'

const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
const appSource = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8')
const match = appSource.match(/const VERSION = ['"]([^'"]+)['"]/)

if (!match) {
  console.error('Version check failed: src/App.jsx does not declare VERSION.')
  process.exit(1)
}

if (match[1] !== packageJson.version) {
  console.error(`Version check failed: package.json=${packageJson.version}, App.jsx=${match[1]}`)
  process.exit(1)
}

console.log(`Version check passed: v${packageJson.version}`)
