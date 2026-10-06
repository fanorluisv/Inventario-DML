const { isDeepStrictEqual } = require('node:util');
class InventoryError extends Error {
  constructor(message, status = 422) { super(message); this.status = status; }
}
const fail = message => { throw new InventoryError(message); };
const object = value => value && typeof value === 'object' && !Array.isArray(value);
const text = (value, label, required = false, max = 4000) => {
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) fail(`${label}: texto inválido.`);
};
const date = (value, label, required = false) => {
  text(value, label, required, 10);
  if (value) {
    const parsed = new Date(`${value}T12:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) fail(`${label}: fecha inválida.`);
  }
};
function rows(value, label, identity = 'id') {
  if (!Array.isArray(value) || value.length > 50000) fail(`${label}: lista inválida.`);
  const ids = new Set();
  for (const row of value) {
    if (!object(row)) fail(`${label}: registro inválido.`);
    text(row[identity], label, true, 200);
    if (ids.has(row[identity])) fail(`${label}: código duplicado ${row[identity]}.`);
    ids.add(row[identity]);
  }
  return ids;
}
const keys = ['equipos', 'monitores', 'licencias', 'responsables', 'hojas-vida', 'actas', 'accesorios', 'fotos'];
function validateInventory(next, previous, credentials) {
  if (!object(next) || Object.keys(next).some(k => !keys.includes(k))) fail('Contenido de inventario inválido.');
  const assets = rows(next.equipos, 'Equipos');
  const monitors = rows(next.monitores, 'Monitores');
  rows(next.licencias, 'Licencias'); rows(next.responsables, 'Responsables', 'name');
  rows(next['hojas-vida'], 'Hoja de vida'); const deliveries = rows(next.actas, 'Actas');
  if (!object(next.accesorios)) fail('Inventario de accesorios inválido.');
  const stock = rows(next.accesorios.stock, 'Bodega'); rows(next.accesorios.assignments, 'Entregas de accesorios');
  if (!object(next.fotos)) fail('Fotografías inválidas.');
  const reference = (id, label, optional = false) => { if (!(optional && id === '') && !assets.has(id)) fail(`${label}: el equipo no existe.`); };
  for (const a of next.equipos) {
    if (a.osLicensed !== undefined && typeof a.osLicensed !== 'boolean') fail('Indica Sí o No para el sistema operativo licenciado.');
    if (a.gpuReference !== undefined) text(a.gpuReference, 'Referencia de tarjeta dedicada', ['Dedicada','Integrada y dedicada'].includes(a.gpu), 120);
    if (a.description !== undefined) text(a.description, 'Descripción del equipo', false, 120);
    for (const k of ['id','name','type','owner','status']) text(a[k], `Equipo ${k}`, true, 200);
    for (const k of ['model','serial','area','location','screen','ram','cpu','disk','os','observations','brand','gpu','maintenance']) text(a[k], `Equipo ${k}`);
    if (!['Buen estado','Regular','Malo','En revisión','Baja'].includes(a.status)) fail('Estado de equipo inválido.');
    if (!['Sí','No'].includes(a.maintenance)) fail('Mantenimiento inválido.');
    date(a.acquired, 'Adquisición'); date(a.lastMaintenance, 'Mantenimiento', a.maintenance === 'Sí');
    if (a.lastMaintenance && a.acquired && a.lastMaintenance < a.acquired) fail('El mantenimiento no puede preceder la adquisición.');
    const old = previous.equipos.find(x => x.id === a.id);
    if (old && old.type !== a.type) fail('El tipo del equipo no se puede cambiar.');
    if (monitors.has(a.id)) fail('Un equipo y un monitor no pueden compartir código.');
  }
  const serials = new Map();
  for (const a of [...next.equipos, ...next.monitores]) {
    text(a.serial, 'Serial');
    const serial = a.serial.replace(/\s/g, '').toUpperCase();
    if (serial && serials.has(serial)) fail(`El serial ${a.serial} ya pertenece a ${serials.get(serial)}. No puede repetirse en ${a.id}.`);
    if (serial) serials.set(serial, a.id);
  }
  const identifications = new Set();
  const personNames = new Set();
  for (const p of next.responsables) {
    text(p.documentType, 'Tipo de documento', true, 100); text(p.identification, 'Identificación', false, 100);
    const name = p.name.trim().toLocaleLowerCase('es');
    if (personNames.has(name)) fail('Ya existe un responsable con ese nombre.');
    personNames.add(name);
    const identification = p.identification.replace(/[\s.-]/g, '').toUpperCase();
    if (identification && identifications.has(identification)) fail('Identificación de responsable duplicada.');
    if (identification) identifications.add(identification);
  }
  for (const m of next.monitores) {
    for (const k of ['brand','model','size','serial','status']) text(m[k], `Monitor ${k}`, k !== 'serial', 200);
    date(m.acquired, 'Adquisición del monitor'); reference(m.equipmentId, 'Monitor', true);
    if (!Array.isArray(m.history) || m.history.some(h => typeof h !== 'string' || h.length > 1000)) fail('Historial de monitor inválido.');
    const old = previous.monitores.find(x => x.id === m.id);
    if (old && old.history.some(h => !m.history.includes(h))) fail('No se puede borrar el historial del monitor.');
  }
  const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Bogota' }).format(new Date());
  for (const l of next.licencias) {
    for (const k of ['product','version','origin','modality','rule','serial','observations']) text(l[k], `Licencia ${k}`, k === 'product');
    if (!['Incluida con el equipo','Adquirida por separado'].includes(l.origin)) fail('Origen de licencia inválido.');
    if (!Number.isSafeInteger(l.quantity) || l.quantity < 1 || l.quantity > 100000) fail('Cantidad de licencias inválida.');
    if (!Array.isArray(l.assignedIds) || new Set(l.assignedIds).size !== l.assignedIds.length || l.assignedIds.length > l.quantity) fail('Cupos de licencia duplicados o insuficientes.');
    l.assignedIds.forEach(id => reference(id, 'Licencia')); reference(l.equipmentId, 'Licencia', true);
    date(l.acquired, 'Compra de licencia'); date(l.expires, 'Vencimiento');
    if (l.expires && l.acquired && l.expires < l.acquired) fail('El vencimiento precede la compra.');
    if (l.origin === 'Incluida con el equipo' && (!l.equipmentId || l.quantity !== 1 || l.assignedIds.length !== 1 || l.assignedIds[0] !== l.equipmentId)) fail('La licencia incluida debe conservar un único equipo.');
    const old = previous.licencias.find(x => x.id === l.id);
    if (old?.origin === 'Incluida con el equipo' && (l.origin !== old.origin || l.equipmentId !== old.equipmentId)) fail('No se puede transferir una licencia incluida con un equipo.');
    if (l.expires && l.expires < today && l.assignedIds.some(id => !old?.assignedIds.includes(id))) fail('No se pueden asignar cupos vencidos.');
  }
  for (const old of previous.licencias) if (old.assignedIds.length && !next.licencias.some(l => l.id === old.id)) fail('Libera los cupos antes de eliminar el lote.');
  for (const e of next['hojas-vida']) {
    reference(e.equipmentId, 'Evento'); date(e.date, 'Fecha de evento', true);
    for (const k of ['kind','description','technician']) text(e[k], `Evento ${k}`, true);
    for (const k of ['hours','cost']) if (e[k] && (!Number.isFinite(Number(e[k])) || Number(e[k]) < 0)) fail('Horas y costo deben ser positivos.');
    const a = next.equipos.find(a => a.id === e.equipmentId);
    if (a.acquired && e.date < a.acquired) fail('El evento precede la adquisición.');
  }
  for (const d of next.actas) {
    if (!object(d.asset) || !object(d.person) || !Array.isArray(d.monitors)) fail('Acta incompleta.');
    reference(d.asset.id, 'Acta'); date(d.date, 'Entrega', true);
    text(d.person.name, 'Responsable del acta', true); text(d.person.identification, 'Identificación del acta', true);
    for (const k of ['city','accessories','purpose','duration','programs','deliveredBy','conditions','authorizedBy','receivedDate','returnDate','licenseText']) text(d[k], `Acta ${k}`, false, 16000);
    date(d.receivedDate, 'Recibido'); date(d.returnDate, 'Devolución');
    if ((d.asset.acquired && d.date < d.asset.acquired) || (d.returnDate && d.returnDate < d.date)) fail('Fechas del acta inválidas.');
  }
  // Corrections preserve record IDs and their original equipment association.
  for (const key of ['actas','hojas-vida']) for (const old of previous[key]) {
    const current = next[key].find(x => x.id === old.id);
    if (!current) fail('No se puede borrar el historial guardado.');
    if (key === 'actas' && (!isDeepStrictEqual(old.asset, current.asset) || !isDeepStrictEqual(old.monitors, current.monitors))) fail('La corrección del acta debe conservar los activos entregados.');
    if (key === 'hojas-vida' && (old.equipmentId !== current.equipmentId || old.kind !== current.kind)) fail('La corrección debe conservar el equipo y el tipo de evento.');
  }
  for (const s of next.accesorios.stock) {
    text(s.name, 'Accesorio', true); text(s.brand, 'Marca');
    if (!Number.isSafeInteger(s.quantity) || s.quantity < 1 || s.quantity > 100000) fail('Cantidad de bodega inválida.');
    const used = next.accesorios.assignments.filter(a => a.stockId === s.id && !a.returned).reduce((n, a) => n + a.quantity, 0);
    if (used > s.quantity) fail('No hay suficientes accesorios en bodega.');
  }
  for (const a of next.accesorios.assignments) {
    if (!stock.has(a.stockId) || !deliveries.has(a.deliveryId)) fail('La entrega debe relacionar accesorio y acta existentes.');
    reference(a.equipmentId, 'Accesorio'); text(a.responsible, 'Responsable de accesorio', true);
    if (!Number.isSafeInteger(a.quantity) || a.quantity < 1) fail('Cantidad entregada inválida.');
    date(a.date, 'Entrega de accesorio', true); date(a.returned, 'Devolución de accesorio');
    if (a.returned && a.returned < a.date) fail('La devolución precede la entrega.');
  }
  for (const old of previous.accesorios.assignments) {
    const current = next.accesorios.assignments.find(a => a.id === old.id);
    if (!current || ['stockId','equipmentId','deliveryId'].some(key => old[key] !== current[key])) fail('La corrección debe conservar el accesorio, el equipo y el acta originales.');
  }
  for (const [id, photo] of Object.entries(next.fotos)) {
    reference(id, 'Fotografía');
    if (typeof photo !== 'string' || photo.length > 4200000 || !/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/]+=*$/.test(photo)) fail('Fotografía inválida; usa JPG/PNG de hasta 3 MB.');
  }
  rows(credentials, 'Credenciales');
  for (const c of credentials) {
    for (const k of ['username','password','service']) text(c[k], `Credencial ${k}`, true, 500);
    text(c.responsible, 'Responsable de credencial');
    if (!['Equipo','Correo','NAS'].includes(c.kind) || (!c.equipmentId && !c.responsible)) fail('Credencial sin tipo o asociación válida.');
    reference(c.equipmentId, 'Credencial', true);
  }
}
module.exports = { InventoryError, validateInventory, keys, rows, text };
