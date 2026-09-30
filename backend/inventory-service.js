const fs = require('node:fs');
const path = require('node:path');
const { isDeepStrictEqual } = require('node:util');
const { InventoryError, validateInventory, keys } = require('./inventory-validation');
const blank = () => ({ equipos: [], monitores: [], licencias: [], responsables: [], 'hojas-vida': [], actas: [], accesorios: { stock: [], assignments: [] }, fotos: {} });
const iso = value => value ? (value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10)) : '';

async function migrate(pool) {
  // Additive migration: never drops, truncates or replaces existing operational tables.
  await pool.query(`ALTER TABLE activos ADD COLUMN IF NOT EXISTS descripcion TEXT;
  CREATE TABLE IF NOT EXISTS inventario_integrado (
    id INTEGER PRIMARY KEY CHECK (id=1), revision INTEGER NOT NULL DEFAULT 1,
    datos JSONB NOT NULL, credenciales_cifradas TEXT NOT NULL,
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
  ); CREATE TABLE IF NOT EXISTS historial_responsables (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY, codigo TEXT NOT NULL,
    anterior TEXT NOT NULL, nuevo TEXT NOT NULL, actor_id BIGINT REFERENCES app_users(id),
    fecha TIMESTAMPTZ NOT NULL DEFAULT now()
  );`);
  await pool.query(fs.readFileSync(path.join(__dirname, 'db/identity-guards.sql'), 'utf8'));
}

async function initialize(client, encrypt, decrypt) {
  // The advisory lock also serializes the first import and legacy writes.
  await client.query('SELECT pg_advisory_xact_lock(76192001)');
  const existing = await client.query('SELECT * FROM inventario_integrado WHERE id=1 FOR UPDATE');
  if (existing.rows[0]) return existing.rows[0];
  const state = blank();
  const people = (await client.query('SELECT * FROM responsables ORDER BY id')).rows;
  const assets = (await client.query('SELECT * FROM activos ORDER BY id')).rows;
  const names = new Map(people.map(p => [String(p.id), p.nombre]));
  const codes = new Map(assets.map(a => [String(a.id), a.codigo]));
  state.responsables = people.map(p => ({ name: p.nombre, identification: p.identificacion || '', documentType: 'Cédula de ciudadanía' }));
  state.equipos = assets.map(a => ({ id: a.codigo, name: a.nombre, description: a.descripcion || '', type: a.tipo, brand: a.marca || '', model: a.modelo || '', serial: a.serial || '', owner: names.get(String(a.responsable_id)) || 'Sin asignar', acquired: iso(a.fecha_adquisicion), status: a.disponibilidad === 'Baja' ? 'Baja' : a.estado, observations: a.observaciones || '', area: '', location: '', screen: '', ram: '', cpu: '', disk: '', os: '', gpu: '', maintenance: 'No', lastMaintenance: '' }));
  const lots = (await client.query('SELECT l.*,p.nombre producto,p.version FROM licencias l JOIN productos p ON p.id=l.producto_id ORDER BY l.id')).rows;
  const assignments = (await client.query('SELECT * FROM asignaciones_licencia WHERE fin IS NULL')).rows;
  if (assignments.some(a => a.responsable_id)) throw new InventoryError('Hay licencias asignadas por persona. Se requiere adaptar esas asignaciones antes de habilitar la integración.', 409);
  if (assignments.some(a => a.cupos !== 1)) throw new InventoryError('Hay asignaciones con varios cupos por equipo. Deben revisarse antes de importar al modelo de un cupo por equipo.', 409);
  state.licencias = lots.map(l => {
    const assignedIds = assignments.filter(a => String(a.licencia_id) === String(l.id)).map(a => codes.get(String(a.activo_id)));
    return { id: `LIC-${String(l.id).padStart(3, '0')}`, product: l.producto, version: l.version || 'Por confirmar', origin: l.tipo === 'oem' ? 'Incluida con el equipo' : 'Adquirida por separado', acquired: '', expires: iso(l.vencimiento), modality: l.tipo === 'suscripcion' ? 'Suscripción' : ['perpetua','oem'].includes(l.tipo) ? 'Perpetua' : 'Por confirmar', equipmentId: l.tipo === 'oem' ? assignedIds[0] || '' : '', quantity: l.cupos_totales || l.cantidad_comprada || Math.max(1, assignedIds.length), assignedIds, rule: 'Verificar las condiciones del contrato.', serial: l.serial || '', observations: l.observaciones || '' };
  });
  const credentials = (await client.query('SELECT * FROM credenciales ORDER BY id')).rows.map(c => ({ id: `cred-${c.id}`, kind: { equipo: 'Equipo', correo: 'Correo', nas: 'NAS' }[c.tipo], username: c.usuario, password: decrypt(c.secreto_cifrado), equipmentId: codes.get(String(c.activo_id)) || '', responsible: names.get(String(c.responsable_id)) || '', service: c.observaciones || c.tipo }));
  validateInventory(state, state, credentials);
  const result = await client.query('INSERT INTO inventario_integrado(id,datos,credenciales_cifradas) VALUES(1,$1,$2) RETURNING *', [JSON.stringify(state), encrypt(JSON.stringify(credentials))]);
  return result.rows[0];
}

async function transaction(pool, action) {
  const client = await pool.connect();
  try { await client.query('BEGIN'); const result = await action(client); await client.query('COMMIT'); return result; }
  catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

async function synchronizeAssets(client, next, previous, actor) {
  const people = (await client.query('SELECT id,nombre FROM responsables ORDER BY id')).rows;
  const nameKey = name => name.trim().toLocaleLowerCase('es');
  const byName = new Map();
  for (const p of people) {
    const key = nameKey(p.nombre);
    byName.set(key, [...(byName.get(key) || []), p.id]);
  }
  const personId = name => {
    const ids = byName.get(nameKey(name)) || [];
    if (ids.length > 1) throw new InventoryError(`Hay varios responsables llamados «${name}». Revisa sus identificaciones antes de cambiar esa asignación.`, 409);
    return ids[0] || null;
  };
  const changedPeople = next.responsables.filter(p => !previous.responsables.some(old => isDeepStrictEqual(old, p)));
  const changedOwners = next.equipos.filter(a => !previous.equipos.some(old => old.id === a.id && old.owner === a.owner));
  const allNames = new Set([...changedPeople.map(p => p.name), ...changedOwners.map(a => a.owner).filter(n => n !== 'Sin asignar')]);
  for (const name of allNames) {
    const p = next.responsables.find(p => p.name === name);
    if (!byName.has(nameKey(name))) {
      const r = await client.query('INSERT INTO responsables(nombre,identificacion) VALUES($1,$2) RETURNING id', [name, p?.identification || null]);
      byName.set(nameKey(name), [r.rows[0].id]);
    } else if (p) await client.query('UPDATE responsables SET identificacion=$1,actualizado_en=now() WHERE id=$2', [p.identification || null, personId(name)]);
  }
  for (const old of previous.responsables) if (!next.responsables.some(p => p.name === old.name)) await client.query('UPDATE responsables SET identificacion=NULL,actualizado_en=now() WHERE nombre=$1', [old.name]);
  for (const a of next.equipos) {
    const old = previous.equipos.find(x => x.id === a.id);
    if (isDeepStrictEqual(old, a)) continue;
    const params = [a.id, a.type, a.name, a.brand, a.model, a.serial, a.acquired || null, a.status, a.status === 'Baja' ? 'Baja' : a.owner === 'Sin asignar' ? 'Libre' : 'Asignado', a.owner === 'Sin asignar' || (old && old.owner === a.owner) ? null : personId(a.owner), a.observations, a.description || ''];
    if (!old) {
      const reserved = await client.query('SELECT 1 FROM activos WHERE codigo=$1', [a.id]);
      if (reserved.rowCount) throw new InventoryError(`El código ${a.id} ya se utilizó. Recarga para obtener otro código.`, 409);
      await client.query('INSERT INTO activos(codigo,tipo,nombre,marca,modelo,serial,fecha_adquisicion,estado,disponibilidad,responsable_id,observaciones,descripcion) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)', params);
    } else await client.query('UPDATE activos SET tipo=$2,nombre=$3,marca=$4,modelo=$5,serial=$6,fecha_adquisicion=$7,estado=$8,disponibilidad=$9,responsable_id=CASE WHEN $13 THEN responsable_id ELSE $10 END,observaciones=$11,descripcion=$12,actualizado_en=now() WHERE codigo=$1', [...params, old.owner === a.owner]);
    if (!old || old.owner !== a.owner) await client.query('INSERT INTO historial_responsables(codigo,anterior,nuevo,actor_id) VALUES($1,$2,$3,$4)', [a.id, old?.owner || 'Sin registro previo', a.owner, actor]);
  }
  for (const old of previous.equipos) if (!next.equipos.some(a => a.id === old.id)) {
    // Retain the old row and its code for audit/references, while removing it from the current inventory.
    await client.query("UPDATE activos SET disponibilidad='Baja',actualizado_en=now() WHERE codigo=$1", [old.id]);
  }
}

function installInventory(app, { pool, auth, encrypt, decrypt }) {
  app.get('/api/v1/inventario', auth(), async (req, res) => {
    const data = await transaction(pool, async client => {
      const row = await initialize(client, encrypt, decrypt);
      const history = (await client.query('SELECT codigo,anterior,nuevo,fecha FROM historial_responsables ORDER BY id DESC')).rows;
      const reservedCodes = (await client.query('SELECT codigo FROM activos')).rows.map(a => a.codigo);
      return { revision: row.revision, state: row.datos, history, reservedCodes };
    });
    res.set('Cache-Control', 'no-store').json({ data });
  });
  app.get('/api/v1/inventario/credenciales', auth('administrador_ti'), async (req, res) => {
    const data = await transaction(pool, async client => {
      const row = await initialize(client, encrypt, decrypt);
      await client.query("INSERT INTO auditoria(actor_id,accion,entidad) VALUES($1,'consultar','credenciales')", [req.user.sub]);
      return { revision: row.revision, items: JSON.parse(decrypt(row.credenciales_cifradas)) };
    });
    res.set('Cache-Control', 'no-store').json({ data });
  });
  app.post('/api/v1/inventario/responsable', auth('editor'), async (req, res) => {
    const { revision, previousName, person } = req.body || {};
    if (!Number.isSafeInteger(revision) || typeof previousName !== 'string' || !person || typeof person.name !== 'string' || !person.name.trim() || person.name.length > 120 || person.name.trim().toLocaleLowerCase() === 'sin asignar') throw new InventoryError('Nombre de responsable inválido.');
    person.name = person.name.trim();
    const data = await transaction(pool, async client => {
      const row = await initialize(client, encrypt, decrypt);
      if (revision !== row.revision) throw new InventoryError('Otra sesión guardó cambios. Recarga antes de editar el responsable.', 409);
      const records = await client.query('SELECT id,nombre FROM responsables WHERE lower(btrim(nombre))=lower(btrim($1)) FOR UPDATE', [previousName]);
      if (records.rows.length !== 1) throw new InventoryError('No se pudo identificar un responsable único.', 409);
      const id = records.rows[0].id;
      const duplicate = await client.query("SELECT id FROM responsables WHERE id<>$1 AND (lower(btrim(nombre))=lower(btrim($2)) OR (identificacion=$3 AND $3<>''))", [id, person.name, person.identification]);
      if (duplicate.rowCount) throw new InventoryError('Ya existe otro responsable con ese nombre o identificación.');
      const matchesName = name => typeof name === 'string' && name.trim().toLocaleLowerCase('es') === previousName.trim().toLocaleLowerCase('es');
      const next = structuredClone(row.datos);
      next.responsables = [...next.responsables.filter(p => !matchesName(p.name)), { name: person.name, identification: person.identification, documentType: person.documentType }];
      next.equipos = next.equipos.map(a => matchesName(a.owner) ? { ...a, owner: person.name } : a);
      const credentials = JSON.parse(decrypt(row.credenciales_cifradas)).map(c => matchesName(c.responsible) ? { ...c, responsible: person.name } : c);
      validateInventory(next, row.datos, credentials);
      await client.query('UPDATE responsables SET nombre=$1,identificacion=$2,actualizado_en=now() WHERE id=$3', [person.name, person.identification || null, id]);
      await client.query('UPDATE inventario_integrado SET datos=$1,credenciales_cifradas=$2,revision=revision+1,actualizado_en=now() WHERE id=1', [JSON.stringify(next), encrypt(JSON.stringify(credentials))]);
      await client.query("INSERT INTO auditoria(actor_id,accion,entidad,cambios_json) VALUES($1,'editar','responsables',$2)", [req.user.sub, JSON.stringify({ id, anterior: previousName, nuevo: person.name })]);
      return { revision: row.revision + 1, state: next };
    });
    res.json({ data });
  });
  app.put('/api/v1/inventario', auth('editor'), async (req, res) => {
    const b = req.body || {};
    if (!Number.isSafeInteger(b.revision)) throw new InventoryError('Falta la revisión del inventario.');
    if (Object.hasOwn(b, 'credentials') && req.user.rol !== 'administrador_ti') throw new InventoryError('Solo el administrador puede modificar credenciales.', 403);
    const data = await transaction(pool, async client => {
      const row = await initialize(client, encrypt, decrypt);
      if (b.revision !== row.revision) throw new InventoryError('Otra sesión guardó cambios. Recarga los datos antes de continuar; tus cambios pendientes aún no están guardados.', 409);
      const oldCredentials = JSON.parse(decrypt(row.credenciales_cifradas));
      const credentials = b.credentials === undefined ? oldCredentials : b.credentials;
      let next = b.state;
      if (b.changes !== undefined) {
        if (b.state !== undefined || !b.changes || typeof b.changes !== 'object' || Array.isArray(b.changes) || Object.keys(b.changes).some(k => !keys.includes(k) || k === 'fotos')) throw new InventoryError('Cambios de inventario inválidos.');
        if (!b.photos || typeof b.photos !== 'object' || Array.isArray(b.photos)) throw new InventoryError('Cambios de fotografías inválidos.');
        const fotos = { ...row.datos.fotos };
        for (const [id, value] of Object.entries(b.photos)) { if (value === null) delete fotos[id]; else fotos[id] = value; }
        next = { ...row.datos, ...b.changes, fotos };
      }
      validateInventory(next, row.datos, credentials);
      const changed = keys.filter(k => !isDeepStrictEqual(row.datos[k], next[k]));
      if (!isDeepStrictEqual(oldCredentials, credentials)) changed.push('credenciales');
      if (!changed.length) return { revision: row.revision };
      await synchronizeAssets(client, next, row.datos, req.user.sub);
      await client.query('UPDATE inventario_integrado SET datos=$1,credenciales_cifradas=$2,revision=revision+1,actualizado_en=now() WHERE id=1', [JSON.stringify(next), encrypt(JSON.stringify(credentials))]);
      // Never copy credential secrets into audit logs.
      await client.query("INSERT INTO auditoria(actor_id,accion,entidad,cambios_json) VALUES($1,'guardar','inventario',$2)", [req.user.sub, JSON.stringify({ revision: row.revision + 1, modulos: changed })]);
      const history = (await client.query('SELECT codigo,anterior,nuevo,fecha FROM historial_responsables ORDER BY id DESC')).rows;
      const reservedCodes = (await client.query('SELECT codigo FROM activos')).rows.map(a => a.codigo);
      return { revision: row.revision + 1, history, reservedCodes };
    });
    res.json({ data });
  });
  // Old clients must not bypass revision checks or create records outside the integrated inventory.
  app.use(['/api/v1/activos','/api/v1/responsables','/api/v1/credenciales'], async (req, res, next) => {
    if (req.method === 'GET') return next();
    return res.status(409).json({ error: { message: 'Actualiza la página y usa los formularios del inventario integrado.' } });
  });
}
module.exports = { blank, migrate, initialize, transaction, installInventory, synchronizeAssets };
