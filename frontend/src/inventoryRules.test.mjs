import { test } from 'node:test'
import assert from 'node:assert/strict'
import { nextMaintenance, assignSeat, licenseExpiration } from './inventoryRules.ts'
test('mantenimiento usa seis meses calendario y ajusta fin de mes',()=>{
 assert.equal(nextMaintenance('2025-08-31'),'2026-02-28')
 assert.equal(nextMaintenance('2023-08-31'),'2024-02-29')
 assert.equal(nextMaintenance('2026-09-11'),'2027-03-11')
 assert.equal(nextMaintenance(''),'')
})
test('último cupo, duplicados y liberación antes de reasignar',()=>{
 const ids=assignSeat(['DML-001'],'DML-002',2)
 assert.deepEqual(ids,['DML-001','DML-002'])
 assert.deepEqual(assignSeat(ids,'DML-003',2),ids)
 assert.deepEqual(assignSeat(ids,'DML-002',3),ids)
 const released=ids.filter(id=>id!=='DML-001')
 assert.deepEqual(assignSeat(released,'DML-003',2),['DML-002','DML-003'])
 assert.deepEqual(assignSeat([], '',2),[])
})

test('vencimiento suma años calendario y ajusta el 29 de febrero',()=>{
 assert.equal(licenseExpiration('2026-10-06',1),'2027-10-06')
 assert.equal(licenseExpiration('2026-10-06',3),'2029-10-06')
 assert.equal(licenseExpiration('2024-02-29',1),'2025-02-28')
 assert.equal(licenseExpiration('2024-02-29',4),'2028-02-29')
 for(const [date,years] of [['',1],['2026-02-30',1],['2026-10-06',0],['2026-10-06',1.5],['9999-01-01',1]])assert.equal(licenseExpiration(date,years),'')
})
