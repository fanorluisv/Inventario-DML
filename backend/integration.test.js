const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');
const { Pool } = require('pg');

// Explicit opt-in. Only the disposable local test cluster is accepted.
test('Integración PostgreSQL: migración, módulos, roles, transacciones y concurrencia', { skip: !process.env.TEST_INVENTORY_DATABASE_URL }, async t => {
  const url = new URL(process.env.TEST_INVENTORY_DATABASE_URL);
  assert.equal(url.hostname, '127.0.0.1'); assert.equal(url.port, '55439');
  const admin = new Pool({ connectionString: url.toString() });
  const schema = `inventario_test_${crypto.randomBytes(8).toString('hex')}`;
  await admin.query(`CREATE SCHEMA ${schema}`);
  url.searchParams.set('options', `-c search_path=${schema}`);
  process.env.DATABASE_URL = url.toString();
  process.env.JWT_SECRET = crypto.randomBytes(32).toString('hex');
  process.env.CREDENTIALS_KEY = crypto.randomBytes(32).toString('hex');
  const { app, pool, passwordHash } = require('./operational');
  const { migrate } = require('./inventory-service');
  let server;
  try {
    await pool.query(fs.readFileSync(`${__dirname}/db/postgres-schema.sql`, 'utf8'));
    const password = 'Prueba-segura-1234';
    const actor = (await pool.query("INSERT INTO app_users(nombre,email,password_hash,rol) VALUES('Administrador','admin@example.test',$1,'administrador_ti') RETURNING id", [passwordHash(password)])).rows[0];
    const owner = (await pool.query("INSERT INTO responsables(nombre,identificacion,cargo) VALUES('Persona existente','111','TI') RETURNING id")).rows[0];
    await pool.query("INSERT INTO activos(codigo,nombre,tipo,marca,modelo,serial,fecha_adquisicion,responsable_id,disponibilidad) VALUES('REAL-001','Equipo ya registrado','Portátil','Lenovo','E14','SER-001','2024-01-02',$1,'Asignado')", [owner.id]);
    await migrate(pool); await migrate(pool);
    const express = require('express');
    server = express().use(express.static(`${__dirname}/../frontend/dist`)).use(app).listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    const base = `http://127.0.0.1:${server.address().port}/api/v1/`;
    async function call(path, token = '', body, method = body === undefined ? 'GET' : 'POST') {
      const response = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
      return { status: response.status, ...(await response.json()) };
    }
    async function login(email = 'admin@example.test') { const r = await call('auth/login', '', { email, password }); assert.equal(r.status, 200); return r.data.token; }
    const token = await login();
    let original = (await call('inventario', token)).data;
    await t.test('conserva el equipo y responsable originales sin sembrar ejemplos', async () => {
      assert.equal(original.state.equipos.length, 1); assert.equal(original.state.equipos[0].id, 'REAL-001');
      assert.equal(original.state.responsables[0].identification, '111');
      assert.equal(original.state.monitores.length, 0); assert.equal(original.state.licencias.length, 0);
      assert.equal((await call('inventario')).status, 401);
      assert.equal((await pool.query('SELECT cargo FROM responsables WHERE id=$1', [owner.id])).rows[0].cargo, 'TI');
    });
    const state = structuredClone(original.state);
    const equipment = state.equipos[0]; equipment.description = 'Portátil de Contabilidad'; equipment.os = 'Windows 11 Pro'; equipment.osLicensed = true; equipment.gpu = 'Dedicada'; equipment.gpuReference = 'NVIDIA RTX 4060'; equipment.ram = '32 GB'; equipment.location = 'Oficina'; equipment.maintenance = 'Sí'; equipment.lastMaintenance = '2026-01-10';
    state.monitores.push({ id: 'DML-MON-0001', brand: 'Dell', model: 'P24', size: '24', serial: 'MON001', acquired: '2024-01-02', status: 'Buen estado', equipmentId: equipment.id, history: ['Alta'] });
    state.licencias.push({ id: 'LIC-001', product: 'Software', version: '1', origin: 'Adquirida por separado', acquired: '2026-01-01', expires: '2099-01-01', modality: 'Suscripción', equipmentId: '', quantity: 1, assignedIds: [equipment.id], rule: 'Un cupo', serial: 'LICSER', observations: '' });
    state['hojas-vida'].push({ id: 'EVENT-1', equipmentId: equipment.id, date: '2026-01-10', kind: 'Mantenimiento realizado', technician: 'Técnico', description: 'Limpieza', cost: '10000', hours: '1' });
    state.actas.push({ id: 'ACT-1', asset: { ...equipment }, person: state.responsables[0], monitors: structuredClone(state.monitores), date: '2026-01-11', city: 'Bogotá', accessories: '1 teclado', purpose: 'Trabajo', duration: 'Indefinida', programs: 'Software', deliveredBy: 'TI', conditions: 'Cuidar el equipo', authorizedBy: 'TI', receivedDate: '2026-01-11', returnDate: '', licenseText: 'Software' });
    state.accesorios.stock.push({ id: 'STOCK-1', name: 'Teclado', brand: 'Dell', quantity: 2 });
    state.accesorios.assignments.push({ id: 'ASSIGN-1', stockId: 'STOCK-1', equipmentId: equipment.id, responsible: equipment.owner, quantity: 1, date: '2026-01-11', returned: '', deliveryId: 'ACT-1' });
    state.fotos[equipment.id] = 'data:image/png;base64,iVBORw0KGgo=';
    const credentials = [{ id: 'CRED-1', kind: 'Correo', username: 'persona@example.test', password: 'secreto-no-visible-en-db', equipmentId: equipment.id, responsible: equipment.owner, service: 'Correo corporativo' }];
    await t.test('guarda todos los módulos en una transacción y cifra las credenciales', async () => {
      const saved = await call('inventario', token, { revision: original.revision, state, credentials }, 'PUT');
      assert.equal(saved.status, 200, JSON.stringify(saved));
      const row = (await pool.query('SELECT * FROM inventario_integrado')).rows[0];
      assert.ok(!JSON.stringify(row).includes(credentials[0].password));
      assert.deepEqual(row.datos, state);
      assert.equal((await pool.query('SELECT descripcion FROM activos WHERE codigo=$1', [equipment.id])).rows[0].descripcion, equipment.description);
      assert.equal((await pool.query('SELECT count(*)::int n FROM activos')).rows[0].n, 1);
      const returned = await call('inventario', await login());
      assert.deepEqual(returned.data.state, state);
      assert.equal((await call('inventario/credenciales', token)).data.items[0].password, credentials[0].password);
      original = returned.data;
    });
    await t.test('rechaza conflictos, exceso de cupos, historial alterado y stock insuficiente sin guardar parcialmente', async () => {
      assert.equal((await call('inventario', token, { revision: original.revision - 1, state }, 'PUT')).status, 409);
      for (const mutate of [
        s => s.licencias[0].assignedIds.push(equipment.id),
        s => { s.accesorios.stock[0].quantity = 0; },
        s => { s['hojas-vida'][0].description = 'alterado'; },
        s => { s.equipos = []; },
        s => { s.actas[0].city = 'alterada'; },
        s => { s.equipos[0].acquired = '2026-02-30'; },
        s => { s.equipos[0].description = 'x'.repeat(121); },
        s => { s.equipos[0].description = 123; },
        s => { s.equipos[0].osLicensed = 'Sí'; },
        s => { s.equipos[0].gpuReference = ''; },
      ]) {
        const bad = structuredClone(state); mutate(bad);
        const result = await call('inventario', token, { revision: original.revision, state: bad }, 'PUT');
        assert.equal(result.status, 422, JSON.stringify(result));
        assert.deepEqual((await call('inventario', token)).data.state, state);
      }
    });
    let readerToken, editorToken, editorId;
    await t.test('usuarios reales y permisos efectivos del servidor', async () => {
      for (const rol of ['lector', 'editor']) {
        const result = await call('users', token, { nombre: rol, email: `${rol}@example.test`, rol, activo: true, password });
        assert.equal(result.status, 201, JSON.stringify(result));
        if (rol === 'editor') editorId = result.data.id;
      }
      readerToken = await login('lector@example.test'); editorToken = await login('editor@example.test');
      for (const restricted of [readerToken, editorToken]) {
        assert.equal((await call('inventario/credenciales', restricted)).status, 403);
        assert.equal((await call('users', restricted)).status, 403);
        assert.ok(!JSON.stringify((await call('inventario', restricted)).data).includes(credentials[0].username));
      }
      assert.equal((await call('inventario', readerToken, { revision: original.revision, state }, 'PUT')).status, 403);
      assert.equal((await call('inventario', editorToken, { revision: original.revision, state, credentials: [] }, 'PUT')).status, 403);
      const self = await call(`users/${actor.id}`, token, { nombre: 'Admin', email: 'admin@example.test', rol: 'lector', activo: true }, 'PUT');
      assert.equal(self.status, 422);
      const edit = structuredClone(state); edit.equipos[0].owner = 'Nueva persona';
      assert.equal((await call('inventario', editorToken, { revision: original.revision, state: edit }, 'PUT')).status, 200);
      const loaded = (await call('inventario', token)).data;
      assert.equal(loaded.history[0].nuevo, 'Nueva persona');
      assert.equal(loaded.state.actas[0].person.name, 'Persona existente');
      assert.equal((await call('inventario/credenciales', token)).data.items.length, 1);
      original = loaded;
      await call(`users/${editorId}`, token, { nombre: 'editor', email: 'editor@example.test', rol: 'editor', activo: false }, 'PUT');
      assert.equal((await call('inventario', editorToken)).status, 401);
    });
    await t.test('dos escritores simultáneos no pierden cambios; auditoría sin secretos', async () => {
      const first = structuredClone(original.state); first.equipos[0].location = 'Lugar A';
      const second = structuredClone(original.state); second.equipos[0].location = 'Lugar B';
      const results = await Promise.all([first, second].map(s => call('inventario', token, { revision: original.revision, state: s }, 'PUT')));
      assert.deepEqual(results.map(r => r.status).sort(), [200, 409]);
      const audit = (await pool.query('SELECT * FROM auditoria')).rows;
      assert.ok(audit.some(a => a.entidad === 'inventario'));
      assert.ok(!JSON.stringify(audit).includes(credentials[0].password));
      assert.equal((await call('activos', token, { codigo: 'bypass' })).status, 409);
    });
    await t.test('rechaza seriales y cédulas duplicados en API y PostgreSQL', async () => {
      const current = (await call('inventario', token)).data;
      const originalAsset = current.state.equipos[0];
      const duplicate = structuredClone(current.state);
      duplicate.equipos.push({ ...originalAsset, id: 'DUP-001', serial: ` ${originalAsset.serial.toLowerCase()} `, owner: 'Otra persona' });
      assert.equal((await call('inventario', token, { revision: current.revision, state: duplicate }, 'PUT')).status, 422);
      const duplicatePerson = structuredClone(current.state);
      duplicatePerson.responsables.push({ name: 'Persona duplicada', identification: '1.1-1', documentType: 'Cédula de ciudadanía' });
      assert.equal((await call('inventario', token, { revision: current.revision, state: duplicatePerson }, 'PUT')).status, 422);
      assert.deepEqual((await call('inventario', token)).data.state, current.state);
      await assert.rejects(pool.query("INSERT INTO activos(codigo,nombre,tipo,serial) VALUES('DUP-DB','Duplicado','Portátil',' ser-001 ')") , error => error.code === '23505');
      await assert.rejects(pool.query("INSERT INTO responsables(nombre,identificacion) VALUES('Duplicado','1.1-1')"), error => error.code === '23505');
      const parallel = await Promise.allSettled([
        pool.query("INSERT INTO activos(codigo,nombre,tipo,serial) VALUES('CON-1','Concurrente','Portátil','concurrent-serial')"),
        pool.query("INSERT INTO activos(codigo,nombre,tipo,serial) VALUES('CON-2','Concurrente','Portátil',' CONCURRENT-SERIAL ')")
      ]);
      assert.equal(parallel.filter(r => r.status === 'fulfilled').length, 1);
      assert.equal(parallel.find(r => r.status === 'rejected').reason.code, '23505');
    });
    await t.test('corregir mayúsculas actualiza variantes de nombre en equipos y credenciales', async () => {
      const current = (await call('inventario', token)).data;
      const name = current.state.responsables[0].name;
      const existing = (await pool.query('SELECT id,nombre FROM responsables WHERE nombre=$1', [name])).rows[0];
      const person = current.state.responsables.find(p => p.name === name);
      const mixed = structuredClone(current.state);
      mixed.equipos[0].owner = name.toUpperCase();
      const creds = (await call('inventario/credenciales', token)).data.items.map(c => ({ ...c, responsible: name.toLowerCase() }));
      // Seed an inconsistent legacy reference directly in the disposable test schema.
      const { encrypt } = require('./operational');
      await pool.query('UPDATE inventario_integrado SET datos=$1,credenciales_cifradas=$2 WHERE id=1', [JSON.stringify(mixed), encrypt(JSON.stringify(creds))]);
      for (const corrected of [name.toUpperCase(), name.toLowerCase()]) {
        const before = (await call('inventario', token)).data;
        const previousName = before.state.responsables.find(p => p.identification === person.identification && p.name.toLowerCase() === name.toLowerCase()).name;
        const response = await call('inventario/responsable', token, { revision: before.revision, previousName, person: { ...person, name: corrected } });
        assert.equal(response.status, 200, JSON.stringify(response));
        assert.equal(response.data.state.equipos[0].owner, corrected);
        assert.equal((await call('inventario/credenciales', token)).data.items[0].responsible, corrected);
        assert.equal((await pool.query('SELECT nombre FROM responsables WHERE id=$1', [existing.id])).rows[0].nombre, corrected);
        assert.deepEqual(response.data.state.actas, before.state.actas);
      }
    });
    await t.test('editar responsable conserva ID, equipos, credenciales e historia', async () => {
      const current = (await call('inventario', token)).data;
      const name = current.state.responsables.find(p => p.identification === '111').name;
      const before = (await pool.query('SELECT id,cargo FROM responsables WHERE nombre=$1', [name])).rows[0];
      const person = { name: 'Nombre corregido', identification: '111', documentType: 'Cédula de ciudadanía' };
      const saved = await call('inventario/responsable', token, { revision: current.revision, previousName: name, person });
      assert.equal(saved.status, 200, JSON.stringify(saved));
      const after = (await pool.query('SELECT id,cargo FROM responsables WHERE nombre=$1', [person.name])).rows[0];
      assert.deepEqual(after, before);
      assert.deepEqual(saved.data.state.actas, current.state.actas);
      assert.deepEqual(saved.data.state.accesorios, current.state.accesorios);
      assert.ok(!saved.data.state.equipos.some(a => a.owner === name));
      assert.equal((await call('inventario/responsable', token, { revision: current.revision, previousName: person.name, person })).status, 409);
      assert.equal((await call('inventario/responsable', token, { revision: saved.data.revision, previousName: person.name, person: { ...person, name: 'Sin asignar' } })).status, 422);
    });
    await t.test('navegador: formularios, persistencia al salir, documentos y perfil lector', { skip: !process.env.TEST_CHROME }, async () => {
      await require('./browser-check').browserCheck(base.replace('api/v1/', ''), password);
      const loaded = (await call('inventario', token)).data;
      assert.ok(loaded.state.equipos.some(a => a.serial === 'BROWSER-001'));
      assert.ok(loaded.state.responsables.some(p => p.name === 'Responsable del navegador' && p.identification === '009988'));
      assert.ok(!loaded.state.responsables.some(p => p.name === 'Borrador cancelado'));
      assert.ok(loaded.state.licencias.some(l => l.product === 'Licencia del navegador'));
    });
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    await pool.end();
    await admin.query(`DROP SCHEMA ${schema} CASCADE`);
    await admin.end();
  }
});
