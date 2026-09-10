import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('the release is versioned consistently and uses direct application source', async () => {
  const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
  const version = (await readFile(new URL('../VERSION', import.meta.url), 'utf8')).trim()
  const release = await readFile(new URL('../src/release.js', import.meta.url), 'utf8')
  const vite = await readFile(new URL('../vite.config.js', import.meta.url), 'utf8')

  assert.equal(packageJson.version, '0.10.4')
  assert.equal(version, '0.10.4')
  assert.match(release, /RELEASE_VERSION = '0\.10\.4'/)
  assert.doesNotMatch(vite, /app-transform/)
})
