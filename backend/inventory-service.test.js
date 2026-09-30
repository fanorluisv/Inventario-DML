const { test } = require('node:test');
const assert = require('node:assert/strict');
const { blank, synchronizeAssets } = require('./inventory-service');

function fixture() {
  const calls = [];
  const client = { async query(sql, params) {
    calls.push({ sql, params });
    if (sql.startsWith('SELECT id,nombre')) return { rows: [{ id: 1, nombre: 'Ana' }, { id: 2, nombre: ' ANA ' }] };
    return { rows: [], rowCount: 0 };
  } };
  const previous = blank();
  previous.responsables = [{ name: 'Ana', identification: '111' }];
  previous.equipos = [{ id: 'PC-001', name: 'Equipo', owner: 'Ana', status: 'Bueno' }];
  return { calls, client, previous, next: structuredClone(previous) };
}

test('editar equipo conserva el ID de responsable pese a nombres históricos duplicados', async () => {
  const { calls, client, previous, next } = fixture();
  next.equipos[0].name = 'Nombre corregido';
  await synchronizeAssets(client, next, previous, 1);
  const update = calls.find(c => c.sql.startsWith('UPDATE activos'));
  assert.ok(update.sql.includes('CASE WHEN $13 THEN responsable_id ELSE $10 END'));
  assert.equal(update.params[12], true);
  assert.ok(!calls.some(c => c.sql.startsWith('UPDATE responsables')));
  assert.ok(!calls.some(c => c.sql.includes('INSERT INTO historial_responsables')));
});

test('cambiar asignación a un nombre ambiguo sigue bloqueado', async () => {
  const { calls, client, previous, next } = fixture();
  previous.equipos[0].owner = 'Sin asignar';
  await assert.rejects(synchronizeAssets(client, next, previous, 1), /varios responsables/);
  assert.ok(!calls.some(c => c.sql.startsWith('UPDATE activos')));
});

test('quitar asignación limpia el responsable y registra historia', async () => {
  const { calls, client, previous, next } = fixture();
  next.equipos[0].owner = 'Sin asignar';
  await synchronizeAssets(client, next, previous, 1);
  const update = calls.find(c => c.sql.startsWith('UPDATE activos'));
  assert.equal(update.params[9], null);
  assert.equal(update.params[12], false);
  assert.ok(calls.some(c => c.sql.includes('INSERT INTO historial_responsables')));
});
