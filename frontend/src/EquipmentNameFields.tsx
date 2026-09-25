import { useState } from 'react'
import { assetPrefixes } from './assetCodes'

export function EquipmentNameFields({ existing, suggestedCode, monitors = [] }: {
  existing: { type: string; name: string } | null
  suggestedCode: (type: string) => string
  monitors?: { id: string; brand: string; model: string }[]
}) {
  const [type, setType] = useState(existing?.type || 'Escritorio')
  const [customName, setCustomName] = useState<string | null>(existing?.name ?? null)
  const suggestion = suggestedCode(type)
  return <>
    <label>Tipo de equipo
      <select name="type" disabled={!!existing} value={type} onChange={event => setType(event.target.value)}>
        {Object.keys(assetPrefixes).filter(value => value !== 'Monitor').map(value =>
          <option key={value} value={value}>{value === 'Portátil' ? 'Portátil (Laptop)' : value === 'Escritorio' ? 'Escritorio (Desktop)' : value}</option>)}
      </select>
      <small>El código se genera por tipo y se conserva al editar. Monitores se registran en su pestaña.</small>
    </label>
    <label>Nombre del equipo
      <input name="name" required maxLength={120} value={customName ?? suggestion}
        onChange={event => setCustomName(event.target.value)} />
      <small>{customName === null ? 'Nombre automático según el tipo de equipo. Puedes editarlo.' : 'Nombre personalizado: se conserva al cambiar el tipo.'}</small>
      <button type="button" className="text-button" onClick={() => setCustomName(null)}>Usar sugerencia: {suggestion}</button>
    </label>
    {(type === 'Portátil' || type === 'Escritorio') && <label>Asignar monitor externo<select name="monitorId" defaultValue=""><option value="">Sin monitor adicional</option>{monitors.map(m => <option key={m.id} value={m.id}>{m.id} · {m.brand} {m.model}</option>)}</select><small>Selecciona un monitor disponible. Puedes registrar monitores en Activos TI → Monitores.</small></label>}
  </>
}
