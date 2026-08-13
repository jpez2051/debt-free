import { readFile } from 'node:fs/promises'

const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
const releaseSource = await readFile(new URL('../src/release.js', import.meta.url), 'utf8')
const versionFile = (await readFile(new URL('../VERSION', import.meta.url), 'utf8')).trim()
const match = releaseSource.match(/RELEASE_VERSION\s*=\s*['"]([^'"]+)['"]/)

if (!match) {
  console.error('Version check failed: src/release.js does not declare RELEASE_VERSION.')
  process.exit(1)
}

const versions = {
  'package.json': packageJson.version,
  'release.js': match[1],
  VERSION: versionFile,
}

const unique = new Set(Object.values(versions))
if (unique.size !== 1) {
  console.error(`Version check failed: ${Object.entries(versions).map(([name, value]) => `${name}=${value}`).join(', ')}`)
  process.exit(1)
}

console.log(`Version check passed: v${packageJson.version}`)
