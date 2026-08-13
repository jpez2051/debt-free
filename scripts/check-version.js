import { readFile } from 'node:fs/promises'

const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
const releaseSource = await readFile(new URL('../src/release.js', import.meta.url), 'utf8')
const match = releaseSource.match(/RELEASE_VERSION\s*=\s*['"]([^'"]+)['"]/)

if (!match) {
  console.error('Version check failed: src/release.js does not declare RELEASE_VERSION.')
  process.exit(1)
}

if (match[1] !== packageJson.version) {
  console.error(`Version check failed: package.json=${packageJson.version}, release.js=${match[1]}`)
  process.exit(1)
}

console.log(`Version check passed: v${packageJson.version}`)
