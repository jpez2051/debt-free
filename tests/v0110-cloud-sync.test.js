import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('cloud migration keeps Firebase access private to the signed-in owner', async () => {
  const [rules, client, shell, settings] = await Promise.all([
    readFile(new URL('../firestore.rules', import.meta.url), 'utf8'),
    readFile(new URL('../src/lib/firebaseClient.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/CloudApp.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/SettingsCenter.jsx', import.meta.url), 'utf8'),
  ])
  assert.match(rules, /request\.auth\.uid == userId/)
  assert.match(rules, /allow delete: if false/)
  assert.match(client, /signInWithPopup/)
  assert.match(client, /signInWithRedirect/)
  assert.match(client, /'users', uid/)
  assert.match(shell, /Copy my records to the cloud/)
  assert.match(shell, /Start with a blank workspace/)
  assert.match(shell, /There aren’t any local Debt Free records/)
  assert.match(shell, /function startFresh/)
  assert.match(settings, /Backup restored to your private cloud record/)
})
