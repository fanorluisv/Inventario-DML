import { test } from 'node:test'
import assert from 'node:assert/strict'
import { assetCode, demoEquipmentCode } from './assetCodes.ts'
test('códigos por tipo y relaciones demo sin duplicados',()=>{
 assert.equal(assetCode('Portátil',1),'DML-LAP-0001')
 assert.equal(assetCode('Escritorio',1),'DML-DES-0001')
 assert.equal(assetCode('NAS',1),'DML-NAS-0001')
 assert.equal(assetCode('Monitor',1),'DML-MON-0001')
 assert.equal(assetCode('Router',12),'DML-RTR-0012')
 const ids=Array.from({length:8},(_,i)=>demoEquipmentCode(i))
 assert.equal(new Set(ids).size,8)
 assert.equal(ids[0],'DML-DES-0001')
 assert.equal(ids[1],'DML-LAP-0001')
})
