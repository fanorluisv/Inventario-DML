import {test} from 'node:test'
import assert from 'node:assert/strict'
import {available} from './accessoryRules.ts'
test('bodega descuenta entregas abiertas y recupera devoluciones sin duplicar',()=>{
 const state={stock:[{id:'mouse',name:'Mouse',brand:'Demo',quantity:10}],assignments:[{id:'1',stockId:'mouse',quantity:3,returned:''},{id:'2',stockId:'mouse',quantity:2,returned:'2026-09-11'}]}
 assert.equal(available(state,'mouse'),7)
 state.assignments[0].returned='2026-09-11'
 assert.equal(available(state,'mouse'),10)
 assert.equal(available(state,'missing'),0)
})
