import { test } from 'node:test'
import assert from 'node:assert/strict'
import { InventoryStore } from './InventoryStore.ts'
const session = { token: 'test', user: { id: '1', nombre: 'Test', email: 'test@example.invalid', rol: 'administrador_ti' } }
const initial = () => ({ revision: 1, state: { equipos: [], monitores: [], licencias: [], responsables: [], 'hojas-vida': [], actas: [], accesorios: { stock: [], assignments: [] }, fotos: {} }, history: [], reservedCodes: [] })
test('agrupa acta y accesorios; espera escrituras pendientes antes de salir', async () => {
  const savedFetch = globalThis.fetch
  const requests = []
  const store = new InventoryStore(session, initial())
  let release
  globalThis.fetch = async (_url, options) => {
    requests.push(JSON.parse(options.body))
    if (requests.length === 1) await new Promise(resolve => { release = resolve })
    return Response.json({ data: { revision: requests.length + 1, history: [], reservedCodes: [] } })
  }
  try {
    store.set('actas', [{ id: 'ACT-1' }]); store.set('accesorios', { stock: [], assignments: [{ id: 'A-1' }] })
    const saving = store.flush()
    assert.equal(requests.length, 1)
    assert.equal(requests[0].changes.actas.length, 1)
    assert.equal(requests[0].changes.accesorios.assignments.length, 1)
    store.set('equipos', [{ id: 'EQ-1' }]); release()
    assert.equal(await saving, true)
    assert.equal(requests.length, 2); assert.equal(requests[1].revision, 2)
    assert.equal(store.dirty, false); assert.equal(store.getSnapshot().status, 'saved')
  } finally { store.dispose(); globalThis.fetch = savedFetch }
})
test('un conflicto conserva el borrador y no reintenta sobrescribir otra sesión', async () => {
  const savedFetch = globalThis.fetch
  const store = new InventoryStore(session, initial())
  let calls = 0
  globalThis.fetch = async () => { calls++; return Response.json({ error: { message: 'Conflicto' } }, { status: 409 }) }
  try {
    store.set('equipos', [{ id: 'EQ-1' }])
    assert.equal(await store.flush(), false)
    assert.equal(store.dirty, true); assert.equal(store.getSnapshot().data.equipos.length, 1)
    assert.equal(await store.flush(), false); assert.equal(calls, 1)
  } finally { store.dispose(); globalThis.fetch = savedFetch }
})
test('el perfil lector no crea cambios locales ni transmite escrituras', () => {
  const store = new InventoryStore({ ...session, user: { ...session.user, rol: 'lector' } }, initial())
  store.set('equipos', [{ id: 'EQ-1' }]); assert.equal(store.dirty, false)
  assert.deepEqual(store.getSnapshot().data.equipos, []); store.dispose()
})
test('editar nombre actualiza asociaciones y conserva cambios hechos durante la petición', async () => {
  const savedFetch = globalThis.fetch
  const data = initial()
  data.state.equipos = [{ id: 'EQ-1', owner: 'Anterior', location: 'Oficina' }]
  data.state.responsables = [{ name: 'Anterior', identification: '', documentType: 'Cédula' }]
  const store = new InventoryStore(session, data, [{ responsible: 'ANTERIOR', password: 'local' }])
  let release
  globalThis.fetch = async (url, options) => {
    assert.equal(url, '/api/v1/inventario/responsable')
    assert.equal(JSON.parse(options.body).previousName, 'Anterior')
    await new Promise(resolve => { release = resolve })
    return Response.json({ data: { revision: 2, state: { ...data.state, equipos: [{ ...data.state.equipos[0], owner: 'Corregido' }], responsables: [{ name: 'Corregido', identification: '', documentType: 'Cédula' }] } } })
  }
  try {
    const editing = store.editPerson('Anterior', { name: 'Corregido', identification: '', documentType: 'Cédula' })
    await new Promise(resolve => setTimeout(resolve, 0))
    store.set('equipos', [{ ...data.state.equipos[0], owner: 'anterior', location: 'Bodega' }])
    release()
    await editing
    assert.equal(store.getSnapshot().data.equipos[0].owner, 'Corregido')
    assert.equal(store.getSnapshot().data.equipos[0].location, 'Bodega')
    assert.equal(store.getSnapshot().data.credenciales[0].responsible, 'Corregido')
    assert.equal(store.getSnapshot().data.credenciales[0].password, 'local')
    assert.equal(store.dirty, true)
    assert.equal(store.revision, 2)
  } finally { store.dispose(); globalThis.fetch = savedFetch }
})
