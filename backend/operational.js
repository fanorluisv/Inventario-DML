/* API operativa de LICENCIAS DML. Requiere: npm install pg dotenv. */
const express = require('express');
const cors = require('cors');
const crypto = require('node:crypto');
const path = require('node:path');
const { migrate, installInventory } = require('./inventory-service');
const { installUsers } = require('./operational-users');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const roles = { lector: 1, editor: 2, administrador_ti: 3 };
const secret = process.env.JWT_SECRET;
if (!secret || secret.length < 32) console.warn('JWT_SECRET debe tener al menos 32 caracteres.');

function passwordHash(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  return `${salt}:${crypto.scryptSync(password, salt, 64).toString('hex')}`;
}
function passwordOk(password, stored) {
  const [salt, hash] = String(stored).split(':');
  if (!salt || !hash) return false;
  const actual = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}
function token(payload) {
  const head = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + 28800 })).toString('base64url');
  const input = `${head}.${body}`;
  const sig = crypto.createHmac('sha256', secret || 'invalid-development-secret').update(input).digest('base64url');
  return `${input}.${sig}`;
}
function verify(raw) {
  const [head, body, sig] = String(raw || '').split('.');
  if (!head || !body || !sig) throw new Error('token');
  const expected = crypto.createHmac('sha256', secret || 'invalid-development-secret').update(`${head}.${body}`).digest('base64url');
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) throw new Error('signature');
  const data = JSON.parse(Buffer.from(body, 'base64url').toString());
  if (!data.exp || data.exp < Math.floor(Date.now() / 1000)) throw new Error('expired');
  return data;
}
function auth(required = 'lector') {
  return async (req, res, next) => {
    try {
      const claims = verify(req.headers.authorization?.replace(/^Bearer\s+/i, ''));
      const record = await pool.query('SELECT id,nombre,email,rol,activo FROM app_users WHERE id=$1', [claims.sub]);
      const current = record.rows[0];
      if (!current?.activo) throw new Error('inactive');
      const user = { sub: String(current.id), nombre: current.nombre, email: current.email, rol: current.rol };
      if ((roles[user.rol] || 0) < roles[required]) return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'No tienes permiso para esta operación.' } });
      req.user = user; next();
    } catch { res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Inicia sesión para continuar.' } }); }
  };
}
function encrypt(value) {
  const key = Buffer.from(process.env.CREDENTIALS_KEY || '', 'hex');
  if (key.length !== 32) throw new Error('CREDENTIALS_KEY debe ser hexadecimal de 32 bytes.');
  const iv = crypto.randomBytes(12); const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const data = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
  return `${iv.toString('base64url')}.${cipher.getAuthTag().toString('base64url')}.${data.toString('base64url')}`;
}
function decrypt(value) {
  const key = Buffer.from(process.env.CREDENTIALS_KEY || '', 'hex');
  const [iv, tag, data] = String(value).split('.'); const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64url'));
  decipher.setAuthTag(Buffer.from(tag, 'base64url')); return Buffer.concat([decipher.update(Buffer.from(data, 'base64url')), decipher.final()]).toString('utf8');
}
const app = express();
app.disable('x-powered-by'); app.use(cors({ origin: process.env.FRONTEND_ORIGIN || 'http://127.0.0.1:5173' })); app.use(express.json({ limit: '32mb' }));
app.use((_req,res,next) => { res.set('Cache-Control','no-store'); next(); });
installInventory(app, { pool, auth, encrypt, decrypt });
installUsers(app, { pool, auth, passwordHash });
app.get('/api/v1/salud', async (_req, res) => { try { await pool.query('SELECT 1'); res.json({ data: { estado: 'ok', modo: 'operativo', version: 'integrado-v1' } }); } catch { res.status(503).json({ error: { code: 'DATABASE_UNAVAILABLE', message: 'Base de datos no disponible.' } }); } });
app.post('/api/v1/auth/login', async (req, res) => {
  const { email, password } = req.body || {}; if (typeof email !== 'string' || typeof password !== 'string') return res.status(422).json({ error: { message: 'Correo y contraseña son obligatorios.' } });
  const result = await pool.query('SELECT id,nombre,email,password_hash,rol,activo FROM app_users WHERE lower(email)=lower($1)', [email.trim()]); const user = result.rows[0];
  if (!user || !user.activo || !passwordOk(password, user.password_hash)) return res.status(401).json({ error: { message: 'Credenciales inválidas.' } });
  res.json({ data: { token: token({ sub: String(user.id), nombre: user.nombre, email: user.email, rol: user.rol }), user: { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol } } });
});
app.post('/api/v1/users/bootstrap', async (req, res) => {
  const { nombre, email, password } = req.body || {}; if (!nombre || !email || typeof password !== 'string' || password.length < 12) return res.status(422).json({ error: { message: 'Nombre, correo y contraseña de mínimo 12 caracteres son obligatorios.' } });
  const count = await pool.query('SELECT count(*)::int AS total FROM app_users'); if (count.rows[0].total !== 0) return res.status(409).json({ error: { message: 'El administrador inicial ya fue creado.' } });
  const r = await pool.query('INSERT INTO app_users(nombre,email,password_hash,rol) VALUES($1,$2,$3,\'administrador_ti\') RETURNING id,nombre,email,rol', [nombre.trim(), email.trim().toLowerCase(), passwordHash(password)]); res.status(201).json({ data: r.rows[0] });
});
app.get('/api/v1/auth/me', auth(), (req, res) => res.json({ data: req.user }));
app.get('/api/v1/responsables', auth(), async (_req, res) => { const r = await pool.query('SELECT id,nombre,identificacion,cargo,estado FROM responsables ORDER BY nombre'); res.json({ data: r.rows }); });
app.post('/api/v1/responsables', auth('editor'), async (req, res) => { const { nombre, identificacion, cargo } = req.body || {}; if (!nombre?.trim()) return res.status(422).json({ error: { message: 'El nombre es obligatorio.' } }); const r = await pool.query('INSERT INTO responsables(nombre,identificacion,cargo) VALUES($1,$2,$3) RETURNING *', [nombre.trim(), identificacion || null, cargo || null]); res.status(201).json({ data: r.rows[0] }); });
app.get('/api/v1/activos', auth(), async (_req, res) => { const r = await pool.query('SELECT a.*,r.nombre responsable FROM activos a LEFT JOIN responsables r ON r.id=a.responsable_id WHERE a.disponibilidad <> \'Baja\' ORDER BY a.id DESC'); res.json({ data: r.rows }); });
app.post('/api/v1/activos', auth('editor'), async (req, res) => { const b = req.body || {}; if (!b.codigo || !b.tipo || !b.nombre) return res.status(422).json({ error: { message: 'Código, tipo y nombre son obligatorios.' } }); const r = await pool.query('INSERT INTO activos(codigo,tipo,nombre,marca,modelo,serial,fecha_adquisicion,estado,disponibilidad,responsable_id,observaciones) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *', [b.codigo,b.tipo,b.nombre,b.marca||null,b.modelo||null,b.serial||null,b.fecha_adquisicion||null,b.estado||'Buen estado',b.responsable_id? 'Asignado':'Libre',b.responsable_id||null,b.observaciones||null]); res.status(201).json({ data: r.rows[0] }); });
app.get('/api/v1/credenciales', auth('administrador_ti'), async (_req, res) => { const r = await pool.query('SELECT c.id,c.tipo,c.usuario,c.observaciones,c.responsable_id,c.activo_id,r.nombre responsable,a.codigo activo FROM credenciales c LEFT JOIN responsables r ON r.id=c.responsable_id LEFT JOIN activos a ON a.id=c.activo_id ORDER BY c.id DESC'); res.json({ data: r.rows }); });
app.post('/api/v1/credenciales', auth('administrador_ti'), async (req, res) => { const b=req.body||{}; if (!b.tipo || !b.usuario || !b.secreto) return res.status(422).json({ error: { message: 'Tipo, usuario y secreto son obligatorios.' } }); const r=await pool.query('INSERT INTO credenciales(responsable_id,activo_id,tipo,usuario,secreto_cifrado,observaciones) VALUES($1,$2,$3,$4,$5,$6) RETURNING id,tipo,usuario,responsable_id,activo_id,observaciones',[b.responsable_id||null,b.activo_id||null,b.tipo,b.usuario,encrypt(b.secreto),b.observaciones||null]); res.status(201).json({ data:r.rows[0] }); });
app.use((_req,res)=>res.status(404).json({ error:{ code:'NOT_FOUND', message:'Ruta no disponible.' } }));
app.use((err, _req, res, _next) => {
  const status = err.status || (err.code === '23505' ? 409 : err.code === '23503' ? 422 : 500);
  const message = err.status ? err.message : err.code === '23505' ? 'El código, serial, correo o identificación ya existe en otro registro.' : err.code === '23503' ? 'El registro tiene asociaciones que deben conservarse.' : 'No se pudo completar la operación.';
  if (status === 500) console.error('Error de API:', err.code || err.name);
  res.status(status).json({ error: { message } });
});
async function start() {
  if (!secret || secret.length < 32 || !/^[a-fA-F0-9]{64}$/.test(process.env.CREDENTIALS_KEY || '')) throw new Error('Configura JWT_SECRET y CREDENTIALS_KEY antes de iniciar.');
  await migrate(pool);
  return app.listen(Number(process.env.PORT || 3001), '127.0.0.1', () => console.log('API operativa integrada lista.'));
}
if (require.main === module) start().catch(error => { console.error(error.message); process.exitCode=1; pool.end(); });
module.exports = { app, pool, passwordHash, decrypt, encrypt, token, start };
