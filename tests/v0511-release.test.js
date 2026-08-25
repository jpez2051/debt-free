import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { transformAppV0511 } from '../scripts/v0511-app-transform.js'

test('v0.5.11 transform remains chained into the current release', async () => {
  const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
  const version = (await readFile(new URL('../VERSION', import.meta.url), 'utf8')).trim()
  const release = await readFile(new URL('../src/release.js', import.meta.url), 'utf8')
  const vite = await readFile(new URL('../vite.config.js', import.meta.url), 'utf8')

  assert.equal(packageJson.version, '0.7.0')
  assert.equal(version, '0.7.0')
  assert.match(release, /RELEASE_VERSION = '0\.7\.0'/)
  assert.match(vite, /transformAppV0511/)
  assert.match(transformAppV0511("const VERSION='0.5.10'"), /0\.5\.11/)
})
