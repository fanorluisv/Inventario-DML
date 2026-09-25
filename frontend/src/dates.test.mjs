import { test } from 'node:test'
import assert from 'node:assert/strict'
import { formatDate, parseDate } from './dates.ts'
test('fechas dd/mm/aa convierten sin desplazar días por zona horaria', () => {
  assert.equal(formatDate('2026-09-21'), '21/09/26')
  assert.equal(parseDate('21/09/26'), '2026-09-21')
  assert.equal(parseDate('29/02/24'), '2024-02-29')
  assert.equal(parseDate('31/12/99'), '1999-12-31')
  assert.equal(formatDate(''), '')
  for (const date of ['29/02/25', '31/04/26', '00/12/26', '01/13/26', '2026-09-21', '1/1/26']) assert.equal(parseDate(date), '')
})
