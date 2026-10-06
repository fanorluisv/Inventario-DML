import { test } from 'node:test'
import assert from 'node:assert/strict'
import { formatDate, parseDate } from './dates.ts'
test('fechas dd/mm/aaaa convierten sin desplazar días por zona horaria', () => {
  assert.equal(formatDate('2026-09-21'), '21/09/2026')
  assert.equal(parseDate('21/09/2026'), '2026-09-21')
  assert.equal(parseDate('29/02/2024'), '2024-02-29')
  assert.equal(parseDate('31/12/1999'), '1999-12-31')
  assert.equal(formatDate(''), '')
  for (const date of ['29/02/2025', '31/04/2026', '00/12/2026', '01/13/2026', '2026-09-21', '1/1/26', '21/09/26', '01/01/0000']) assert.equal(parseDate(date), '')
})
