import { samePersonName } from './personNames.ts'
export type OperationalUser = { id: string; nombre: string; email: string; rol: string }
export type Session = { token: string; user: OperationalUser }
export type OwnerHistory = { codigo: string; anterior: string; nuevo: string; fecha: string }
export type InventoryData = Record<string, unknown>
export type InventoryResponse = { revision: number; state: InventoryData; history: OwnerHistory[]; reservedCodes: string[] }
export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) { super(message); this.status = status }
}
export async function request<T>(token: string, path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(`/api/v1/${path}`, {
    method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }), cache: 'no-store',
  })
  const result = await response.json().catch(() => null)
  if (!response.ok) throw new ApiError(result?.error?.message || 'No se pudo guardar. Comprueba la conexión con el servidor.', response.status)
  if (!result || !('data' in result)) throw new Error('Respuesta del servidor inválida.')
  return result.data as T
}
type Snapshot = { data: InventoryData; status: 'saved' | 'pending' | 'saving' | 'error'; error: string; conflict: boolean; history: OwnerHistory[]; reservedCodes: string[] }
export class InventoryStore {
  session: Session
  revision: number
  private snapshot: Snapshot
  private saved: InventoryData
  private listeners = new Set<() => void>()
  private timer: ReturnType<typeof setTimeout> | undefined
  private saving: Promise<boolean> | null = null
  private disposed = false
  private personSaving: Promise<void> | null = null
  constructor(session: Session, result: InventoryResponse, credentials: unknown[] = []) {
    this.session = session; this.revision = result.revision
    this.saved = { ...result.state, credenciales: credentials, usuarios: [] }
    this.snapshot = { data: this.saved, status: 'saved', error: '', conflict: false, history: result.history, reservedCodes: result.reservedCodes }
  }
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener) } }
  getSnapshot = () => this.snapshot
  private emit(update: Partial<Snapshot>) { this.snapshot = { ...this.snapshot, ...update }; this.listeners.forEach(f => f()) }
  get dirty() { return this.snapshot.data !== this.saved }
  correctDraft = () => { if (!this.snapshot.conflict) this.emit({ status: 'pending', error: '' }) }
  set<T>(key: string, action: T | ((old: T) => T)) {
    if (this.disposed || this.snapshot.status === 'error') return
    const old = this.snapshot.data[key] as T
    const next = typeof action === 'function' ? (action as (old: T) => T)(old) : action
    if (JSON.stringify(old) === JSON.stringify(next)) return
    if (this.session.user.rol === 'lector' || (key === 'credenciales' && this.session.user.rol !== 'administrador_ti')) return
    this.emit({ data: { ...this.snapshot.data, [key]: next }, status: 'pending', error: '' })
    clearTimeout(this.timer)
    this.timer = setTimeout(() => { void this.flush() }, 350)
  }
  async editPerson(previousName: string, person: { name: string; identification: string; documentType: string }) {
    if (this.personSaving) throw new Error('Espera a que termine el guardado del responsable.')
    if (!await this.flush()) throw new Error('Guarda o resuelve los cambios pendientes antes de editar el responsable.')
    const baseline = this.snapshot.data
    this.personSaving = (async () => {
      const result = await request<{ revision: number; state: InventoryData }>(this.session.token, 'inventario/responsable', 'POST', { revision: this.revision, previousName, person })
      if (this.disposed) return
      const renameCredentials = (items: unknown) => (items as { responsible: string }[]).map(c => samePersonName(c.responsible || '', previousName) ? { ...c, responsible: person.name } : c)
      const pending = Object.fromEntries(Object.entries(this.snapshot.data).filter(([key, value]) => JSON.stringify(value) !== JSON.stringify(baseline[key])))
      this.revision = result.revision
      this.saved = { ...result.state, credenciales: renameCredentials(baseline.credenciales), usuarios: baseline.usuarios }
      const data = Object.keys(pending).length ? { ...this.saved, ...pending } : this.saved
      if (pending.equipos) data.equipos = (pending.equipos as { owner: string }[]).map(a => samePersonName(a.owner, previousName) ? { ...a, owner: person.name } : a)
      if (pending.responsables) data.responsables = (pending.responsables as { name: string }[]).map(p => samePersonName(p.name, previousName) ? { ...p, ...person } : p)
      if (pending.credenciales) data.credenciales = renameCredentials(pending.credenciales)
      this.emit({ data, status: data === this.saved ? 'saved' : 'pending', error: '' })
    })()
    try { await this.personSaving } finally { this.personSaving = null }
    if (this.dirty) { clearTimeout(this.timer); this.timer = setTimeout(() => { void this.flush() }, 350) }
  }
  flush = (): Promise<boolean> => {
    clearTimeout(this.timer)
    if (this.personSaving) return this.personSaving.then(() => this.flush(), () => false)
    if (this.saving) return this.saving
    if (this.snapshot.conflict || this.disposed) return Promise.resolve(false)
    this.saving = this.persist().finally(() => { this.saving = null })
    return this.saving
  }
  private async persist(): Promise<boolean> {
    while (this.dirty && !this.disposed) {
      const pending = this.snapshot.data
      const { credenciales, usuarios: _users, ...state } = pending
      const changes = Object.fromEntries(Object.entries(state).filter(([key, value]) => key !== 'fotos' && JSON.stringify(value) !== JSON.stringify(this.saved[key])))
      const previousPhotos = this.saved.fotos as Record<string, string>
      const nextPhotos = state.fotos as Record<string, string>
      const photos = Object.fromEntries([...new Set([...Object.keys(previousPhotos), ...Object.keys(nextPhotos)])].filter(key => previousPhotos[key] !== nextPhotos[key]).map(key => [key, nextPhotos[key] ?? null]))
      this.emit({ status: 'saving', error: '' })
      try {
        const result = await request<{ revision: number; history: OwnerHistory[]; reservedCodes: string[] }>(this.session.token, 'inventario', 'PUT', { revision: this.revision, changes, photos, ...(this.session.user.rol === 'administrador_ti' && JSON.stringify(credenciales) !== JSON.stringify(this.saved.credenciales) ? { credentials: credenciales } : {}) })
        this.revision = result.revision; this.saved = pending
        this.emit({ status: this.dirty ? 'pending' : 'saved', history: result.history || this.snapshot.history, reservedCodes: result.reservedCodes || this.snapshot.reservedCodes })
      } catch (e) {
        this.emit({ status: 'error', error: e instanceof Error ? e.message : 'No se pudieron guardar los cambios.', conflict: e instanceof ApiError && e.status === 409 })
        return false
      }
    }
    return true
  }
  dispose() { this.disposed = true; clearTimeout(this.timer); this.listeners.clear(); this.saved = {}; this.snapshot = { ...this.snapshot, data: {} } }
}
