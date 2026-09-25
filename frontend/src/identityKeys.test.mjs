import { test } from 'node:test'
import assert from 'node:assert/strict'
import { identificationKey, serialKey } from './identityKeys.ts'
test('cédulas equivalentes y seriales con espacios o diferente capitalización', () => {
  assert.equal(identificationKey('1.234-567'), identificationKey('1234567'))
  assert.equal(serialKey(' abc 123 '), serialKey('ABC123'))
  assert.notEqual(serialKey('ABC-123'), serialKey('ABC123'))
  assert.equal(serialKey(''), '')
  assert.equal(identificationKey(''), '')
})
