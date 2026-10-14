import {test} from 'node:test'
import assert from 'node:assert/strict'
import {ownerPeriods} from './ownerPeriods.ts'
test('historial genera inicio y devolución sin inventar fechas anteriores',()=>{
 const moves=[{codigo:'PC',anterior:'Ana',nuevo:'Luis',fecha:'2026-10-12T15:00:00Z'},{codigo:'PC',anterior:'Sin asignar',nuevo:'Ana',fecha:'2026-10-01T15:00:00Z'}]
 assert.deepEqual(ownerPeriods('PC','Luis',moves),[{name:'Luis',start:'2026-10-12',returned:'',current:true},{name:'Ana',start:'2026-10-01',returned:'2026-10-12',current:false}])
 assert.deepEqual(ownerPeriods('PC','Ana',[]),[{name:'Ana',start:'',returned:'',current:true}])
 assert.deepEqual(ownerPeriods('PC','Sin asignar',[{codigo:'PC',anterior:'Ana',nuevo:'Sin asignar',fecha:'2026-10-02T02:00:00Z'}]),[{name:'Ana',start:'',returned:'2026-10-01',current:false}])
})
test('reasignaciones al mismo usuario y movimientos simultáneos conservan períodos',()=>{
 const moves=[{codigo:'PC',anterior:'Luis',nuevo:'Ana',fecha:'2026-10-12T15:00:00Z'},{codigo:'PC',anterior:'Ana',nuevo:'Luis',fecha:'2026-10-12T15:00:00Z'}]
 assert.equal(ownerPeriods('PC','Ana',moves).length,3)
 assert.equal(ownerPeriods('PC','Ana',moves)[0].current,true)
 assert.deepEqual(ownerPeriods('OTRO','Sin asignar',moves),[])
})
