import { useState } from 'react'
import type { License } from './inventoryData'
import { formatDate } from './dates'

function licenseStatus(license: License, today: string) {
  if (license.modality === 'Perpetua') return 'Perpetua'
  if (!license.expires) return 'Sin fecha'
  if (license.expires < today) return 'Vencida'
  const limit = new Date(`${today}T12:00:00Z`)
  limit.setUTCDate(limit.getUTCDate() + 30)
  return license.expires <= limit.toISOString().slice(0,10) ? 'Vence en 30 días' : 'Vigente'
}
export function LicenseReport({ licenses, today }: { licenses: License[]; today: string }) {
  const [filter, setFilter] = useState('Todas')
  const rows = licenses.filter(l => filter === 'Todas' || licenseStatus(l, today) === filter).sort((a,b) => (a.expires || '9999').localeCompare(b.expires || '9999'))
  function exportCsv() {
    const data = [['Código','Producto','Modalidad','Período (años)','Inicio','Vencimiento','Estado','Cupos','Asignados'], ...rows.map(l => [l.id,l.product,l.modality,String(l.periodYears || ''),formatDate(l.acquired),formatDate(l.expires),licenseStatus(l,today),String(l.quantity),String(l.assignedIds.length)])]
    const csv = '\uFEFF' + data.map(row => row.map(value => '"' + (/^[=+@\-\t\r]/.test(value) ? "'" : '') + value.replaceAll('"','""') + '"').join(';')).join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'vencimientos-licencias.csv'; anchor.click(); URL.revokeObjectURL(url)
  }
  return <section className="panel"><div className="panel-head"><h2>Reporte de vencimientos de licencias</h2><button className="secondary" onClick={exportCsv}>Exportar licencias CSV</button></div>
    <label>Vigencia<select value={filter} onChange={event => setFilter(event.target.value)}>{['Todas','Vencida','Vence en 30 días','Vigente','Perpetua','Sin fecha'].map(option => <option key={option}>{option}</option>)}</select></label>
    <div className="table-wrap"><table><thead><tr>{['Código / producto','Modalidad','Período','Inicio','Vencimiento','Estado'].map(label => <th key={label}>{label}</th>)}</tr></thead><tbody>{rows.map(l => <tr key={l.id}><td>{l.id}<small>{l.product} {l.version}</small></td><td>{l.modality}</td><td>{l.periodYears ? `${l.periodYears} ${l.periodYears===1?'año':'años'}` : 'No registrado'}</td><td>{formatDate(l.acquired)||'Sin fecha'}</td><td>{l.modality==='Perpetua'?'No aplica':formatDate(l.expires)||'Sin fecha'}</td><td>{licenseStatus(l,today)}</td></tr>)}{!rows.length&&<tr><td colSpan={6}>No hay licencias para este filtro.</td></tr>}</tbody></table></div>
  </section>
}
