import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { RELEASE_VERSION } from '../src/release.js'

test('the release is versioned consistently and uses direct application source', async () => {
  const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
  const release = await readFile(new URL('../src/release.js', import.meta.url), 'utf8')
  const vite = await readFile(new URL('../vite.config.js', import.meta.url), 'utf8')

  assert.equal(RELEASE_VERSION, packageJson.version)
  assert.match(release, /packageInfo\.version/)
  assert.match(await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8'), /const VERSION=RELEASE_VERSION/)
  assert.doesNotMatch(vite, /app-transform/)
})
