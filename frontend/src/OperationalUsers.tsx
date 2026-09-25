import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useInventoryMode } from './InventoryContext'
import { request } from './InventoryStore'
type User = { id: string; nombre: string; email: string; rol: string; activo: boolean }
const roles = { administrador_ti: 'Administrador TI', editor: 'Editor de inventario', lector: 'Solo reportes' }
export function OperationalUsers() {
  const { store } = useInventoryMode()
  const [users, setUsers] = useState<User[]>([])
  const [editing, setEditing] = useState<User | null>(null)
  const [creating, setCreating] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const token = store!.session.token
  useEffect(() => {
    let active = true
    void request<User[]>(token, 'users').then(items => { if (active) setUsers(items) }).catch(e => { if (active) setMessage(e.message) })
    return () => { active = false }
  }, [token])
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage('')
    const form = new FormData(event.currentTarget)
    try {
      const saved = await request<User>(token, editing ? `users/${editing.id}` : 'users', editing ? 'PUT' : 'POST', { nombre: form.get('nombre'), email: form.get('email'), rol: form.get('rol'), activo: form.get('activo') === 'on', password: form.get('password') })
      setUsers(items => editing ? items.map(u => u.id === saved.id ? saved : u) : [...items, saved])
      setEditing(null); setCreating(false); setMessage('Usuario guardado en la base de datos.')
    } catch (e) { setMessage(e instanceof Error ? e.message : 'No se pudo guardar el usuario.') }
    finally { setBusy(false) }
  }
  return <section className="panel"><div className="panel-head"><h2>Usuarios y permisos</h2><button className="primary" onClick={() => { setEditing(null); setCreating(true); setMessage('') }}>Agregar usuario</button></div>
    <p>Los usuarios habilitados pueden iniciar sesión. Deshabilitar un usuario revoca su acceso; sus registros históricos se conservan.</p>
    {message && <p className="notice" role="status">{message}</p>}
    {creating ? <form key={editing?.id || 'new'} onSubmit={save}><fieldset disabled={busy} className="form-grid operational-fields">
      <label>Nombre<input name="nombre" required maxLength={120} defaultValue={editing?.nombre || ''} /></label><label>Correo<input name="email" type="email" required maxLength={150} defaultValue={editing?.email || ''} /></label>
      <label>Perfil<select name="rol" defaultValue={editing?.rol || 'lector'}>{Object.entries(roles).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <label>Usuario habilitado<input name="activo" type="checkbox" defaultChecked={editing?.activo ?? true} /></label>
      <label>{editing ? 'Nueva contraseña (dejar vacía para conservar)' : 'Contraseña de acceso'}<input name="password" type="password" autoComplete="new-password" minLength={12} maxLength={256} required={!editing} /></label>
      <div className="actions"><button className="primary">Guardar usuario</button><button type="button" className="secondary" onClick={() => setCreating(false)}>Cancelar</button></div>
    </fieldset></form> : <div className="table-wrap"><table><thead><tr><th>Nombre</th><th>Correo</th><th>Perfil</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{users.map(u => <tr key={u.id}><td>{u.nombre}</td><td>{u.email}</td><td>{roles[u.rol as keyof typeof roles]}</td><td>{u.activo ? 'Habilitado' : 'Deshabilitado'}</td><td><button className="secondary" onClick={() => { setEditing(u); setCreating(true); setMessage('') }}>Editar acceso</button></td></tr>)}</tbody></table></div>}
    <p>Administrador TI: acceso completo. Editor: modifica inventario y documentos. Solo reportes: consulta y exporta. Credenciales y usuarios: exclusivos del administrador.</p>
  </section>
}
