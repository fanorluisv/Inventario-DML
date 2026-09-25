import { useState } from 'react'
import type { Person } from './EquipmentDocuments'

export function EquipmentOwnerFields({ people, owners, initialOwner }: {
  people: Person[]
  owners: string[]
  initialOwner: string
}) {
  const [creating, setCreating] = useState(false)
  const [selected, setSelected] = useState(initialOwner === 'Sin asignar' ? '' : initialOwner)
  const names = [...new Set([...people.map(p => p.name), ...owners, initialOwner])]
    .filter(name => name && name !== 'Sin asignar').sort((a, b) => a.localeCompare(b, 'es'))

  return <div className="full-width">
    <label>Responsable
      <select name="owner" value={selected} disabled={creating} onChange={e => setSelected(e.target.value)}>
        <option value="">Sin responsable · El equipo quedará libre</option>
        {names.map(name => <option key={name} value={name}>{name}</option>)}
      </select>
    </label>
    <button type="button" className="text-button" onClick={() => setCreating(!creating)}>
      {creating ? 'Cancelar nuevo responsable' : 'Crear nuevo responsable'}
    </button>
    {creating && <fieldset className="operational-fields">
      <legend>Nuevo responsable</legend>
      <input type="hidden" name="createOwner" value="1" />
      <div className="form-grid">
        <label>Nombre del responsable<input name="newOwnerName" required maxLength={120} autoComplete="name" /></label>
        <label>Tipo de identificación<select name="newOwnerDocumentType">
          <option>Cédula de ciudadanía</option><option>Cédula de extranjería</option><option>Pasaporte</option><option>Otro</option>
        </select></label>
        <label>Número de identificación (opcional)<input name="newOwnerIdentification" maxLength={30} /></label>
      </div>
      <p>El responsable se creará y quedará asignado cuando guardes el equipo.</p>
    </fieldset>}
  </div>
}
