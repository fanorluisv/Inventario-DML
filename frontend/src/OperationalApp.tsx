import { useEffect, useState, useSyncExternalStore } from 'react'
import type { FormEvent } from 'react'
import App from './App'
import { InventoryContext } from './InventoryContext'
import { InventoryStore, request } from './InventoryStore'
import type { InventoryResponse, Session } from './InventoryStore'
import './OperationalApp.css'

function Workspace({ store, leave }: { store: InventoryStore; leave: () => void }) {
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => { if (store.dirty) { event.preventDefault(); event.returnValue = '' } }
    window.addEventListener('beforeunload', guard)
    return () => window.removeEventListener('beforeunload', guard)
  }, [store])
  async function logout() {
    setBusy(true)
    if (await store.flush()) { store.dispose(); leave() }
    setBusy(false)
  }
  const status = snapshot.status === 'saved' ? 'Todos los cambios guardados' : snapshot.status === 'saving' ? 'Guardando en la base de datos…' : snapshot.status === 'error' ? 'Cambios sin guardar' : 'Cambios pendientes de guardar…'
  return <InventoryContext.Provider value={store}>
    <div className="save-toolbar"><span role="status">{status}</span><span>{store.session.user.nombre}</span>
      {store.dirty && snapshot.status !== 'error' && <button disabled={busy} onClick={() => void store.flush()}>Guardar ahora</button>}
      <button disabled={busy || snapshot.status === 'error'} onClick={() => void logout()}>Cerrar sesión</button>
    </div>
    <App />
    {snapshot.status === 'error' && <div className="save-error-overlay"><section role="alertdialog" aria-modal="true" aria-labelledby="save-error-title" className="panel">
      <h2 id="save-error-title">Los cambios no se han guardado</h2><p>{snapshot.error}</p><p>El borrador permanece en esta ventana. No cierres la página si necesitas conservarlo.</p>
      {!snapshot.conflict && <button className="primary" onClick={() => void store.flush()}>Reintentar guardado</button>}
      {!snapshot.conflict && <button className="secondary" onClick={store.correctDraft}>Volver a corregir el borrador</button>}
      <button className="secondary" onClick={() => { if (window.confirm('¿Descartar los cambios pendientes y volver a iniciar sesión para cargar lo guardado en el servidor?')) { store.dispose(); leave() } }}>Descartar cambios y volver al acceso</button>
    </section></div>}
  </InventoryContext.Provider>
}
export default function OperationalApp() {
  const [store, setStore] = useState<InventoryStore | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('')
    const form = new FormData(event.currentTarget)
    try {
      const session = await request<Session>('', 'auth/login', 'POST', { email: String(form.get('email')).trim(), password: form.get('password') })
      let data = await request<InventoryResponse>(session.token, 'inventario')
      let credentials: unknown[] = []
      if (session.user.rol === 'administrador_ti') {
        const accounts = await request<{ revision: number; items: unknown[] }>(session.token, 'inventario/credenciales')
        if (accounts.revision !== data.revision) data = await request<InventoryResponse>(session.token, 'inventario')
        if (accounts.revision !== data.revision) throw new Error('El inventario cambió durante el acceso. Ingresa nuevamente.')
        credentials = accounts.items
      }
      setStore(new InventoryStore(session, data, credentials))
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo iniciar sesión.') }
    finally { setBusy(false) }
  }
  if (store) return <Workspace store={store} leave={() => setStore(null)} />
  return <div className="operational"><main className="login-card"><span className="op-brand">DML · Gestión de TI</span><h1>Iniciar sesión</h1><p>Ingresa para consultar y administrar el inventario de la empresa.</p>
    {error && <p className="op-error" role="alert">{error}</p>}
    <form onSubmit={login}><label>Correo<input name="email" type="email" autoComplete="username" required autoFocus /></label><label>Contraseña<input name="password" type="password" autoComplete="current-password" required /></label><button disabled={busy}>{busy ? 'Ingresando…' : 'Ingresar'}</button></form>
  </main></div>
}
