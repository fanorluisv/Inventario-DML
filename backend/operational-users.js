const { InventoryError, text } = require('./inventory-validation');
const { transaction } = require('./inventory-service');
function installUsers(app, { pool, auth, passwordHash }) {
  app.get('/api/v1/users', auth('administrador_ti'), async (_req, res) => {
    const result = await pool.query('SELECT id,nombre,email,rol,activo FROM app_users ORDER BY id');
    res.json({ data: result.rows });
  });
  const save = async (req, res) => {
    const b = req.body || {};
    text(b.nombre, 'Nombre', true, 120); text(b.email, 'Correo', true, 150);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email) || !['administrador_ti','editor','lector'].includes(b.rol) || typeof b.activo !== 'boolean') throw new InventoryError('Correo, perfil o estado inválidos.');
    const id = req.params.id;
    if ((!id || b.password) && (typeof b.password !== 'string' || b.password.length < 12 || b.password.length > 256)) throw new InventoryError('La contraseña debe tener entre 12 y 256 caracteres.');
    const data = await transaction(pool, async client => {
      await client.query('LOCK TABLE app_users IN SHARE ROW EXCLUSIVE MODE');
      const current = id ? (await client.query('SELECT * FROM app_users WHERE id=$1', [id])).rows[0] : null;
      if (id && !current) throw new InventoryError('Usuario no encontrado.', 404);
      if (String(id) === String(req.user.sub) && (!b.activo || b.rol !== 'administrador_ti')) throw new InventoryError('No puedes quitarte el acceso de administración.');
      if (current?.rol === 'administrador_ti' && current.activo && (!b.activo || b.rol !== 'administrador_ti')) {
        const count = await client.query("SELECT count(*)::int n FROM app_users WHERE activo AND rol='administrador_ti'");
        if (count.rows[0].n <= 1) throw new InventoryError('Debe permanecer un administrador activo.');
      }
      const collision = await client.query('SELECT id FROM app_users WHERE lower(email)=lower($1) AND ($2::bigint IS NULL OR id<>$2)', [b.email.trim(), id || null]);
      if (collision.rowCount) throw new InventoryError('Ese correo ya está registrado.', 409);
      const hash = b.password ? passwordHash(b.password) : current.password_hash;
      const args = [b.nombre.trim(), b.email.trim().toLowerCase(), b.rol, b.activo, hash];
      const result = id ? await client.query('UPDATE app_users SET nombre=$1,email=$2,rol=$3,activo=$4,password_hash=$5,actualizado_en=now() WHERE id=$6 RETURNING id,nombre,email,rol,activo', [...args, id]) : await client.query('INSERT INTO app_users(nombre,email,rol,activo,password_hash) VALUES($1,$2,$3,$4,$5) RETURNING id,nombre,email,rol,activo', args);
      await client.query("INSERT INTO auditoria(actor_id,accion,entidad,entidad_id) VALUES($1,$2,'usuarios',$3)", [req.user.sub, id ? 'actualizar' : 'crear', result.rows[0].id]);
      return result.rows[0];
    });
    res.status(id ? 200 : 201).json({ data });
  };
  app.post('/api/v1/users', auth('administrador_ti'), save);
  app.put('/api/v1/users/:id', auth('administrador_ti'), save);
}
module.exports = { installUsers };
