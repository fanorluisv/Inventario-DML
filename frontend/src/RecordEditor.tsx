import { useState } from 'react'
import type { FormEvent } from 'react'
import { DateField } from './DateField'
import { useInventoryMode } from './InventoryContext'

export type EditField = { key: string; label: string; type?: 'date' | 'textarea' | 'number'; required?: boolean; min?: string; max?: string }
export function RecordEditor<T extends object>({ record, fields, label, onSave }: { record: T; fields: EditField[]; label: string; onSave: (next: T) => void }) {
  const { canWrite } = useInventoryMode()
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState('')
  const value = (key: string) => key.split('.').reduce<unknown>((current, part) => (current as Record<string, unknown> | undefined)?.[part], record)
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canWrite) return
    const form = new FormData(event.currentTarget)
    const next = structuredClone(record)
    for (const field of fields) {
      const path = field.key.split('.')
      let target = next as Record<string, unknown>
      for (const part of path.slice(0, -1)) target = target[part] as Record<string, unknown>
      target[path.at(-1)!] = field.type === 'number' ? Number(form.get(field.key)) : String(form.get(field.key) || '').trim()
    }
    try { onSave(next); setEditing(false); setError('') }
    catch (e) { setError(e instanceof Error ? e.message : 'Revisa los datos.') }
  }
  return <section className="record-editor">
    {!editing ? <button disabled={!canWrite} className="secondary" onClick={() => setEditing(true)}>{label}</button> : <form onSubmit={save}>
      <h3>{label}</h3>{error && <p role="alert">{error}</p>}
      <div className="form-grid">{fields.map(field => <label key={field.key} className={field.type === 'textarea' ? 'full-width' : ''}>{field.label}
        {field.type === 'date' ? <DateField name={field.key} defaultValue={String(value(field.key) || '')} required={field.required} min={field.min} max={field.max} /> : field.type === 'textarea' ? <textarea name={field.key} defaultValue={String(value(field.key) || '')} required={field.required} rows={3} maxLength={12000} /> : <input name={field.key} type={field.type === 'number' ? 'number' : 'text'} defaultValue={String(value(field.key) ?? '')} required={field.required} min={field.type === 'number' ? 1 : undefined} step={field.type === 'number' ? 1 : undefined} maxLength={4000} />}
      </label>)}</div>
      <div className="actions"><button disabled={!canWrite} className="primary">Guardar cambios</button><button type="button" className="secondary" onClick={() => { setEditing(false); setError('') }}>Cancelar</button></div>
    </form>}
  </section>
}
