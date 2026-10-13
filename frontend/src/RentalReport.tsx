import { useState } from 'react'
import { formatDate } from './dates'
import type { RentalData } from './EquipmentRentalFields'
type Equipment = RentalData & { id:string;name:string;owner:string }
function returnStatus(a:Equipment,today:string){if(a.rentalStatus==='Devuelto')return 'Devuelto';if(!a.rentalReturnDue)return 'Sin fecha';if(a.rentalReturnDue<today)return 'Devolución vencida';const limit=new Date(`${today}T12:00:00Z`);limit.setUTCDate(limit.getUTCDate()+30);return a.rentalReturnDue<=limit.toISOString().slice(0,10)?'Devolver en 30 días':'Activo'}
export function RentalReport({equipment,today}:{equipment:Equipment[];today:string}){
 const [filter,setFilter]=useState('Todos')
 const rows=equipment.filter(a=>a.tenure==='Alquilado'&&(filter==='Todos'||returnStatus(a,today)===filter)).sort((a,b)=>(a.rentalReturnDue||'9999').localeCompare(b.rentalReturnDue||'9999'))
 return <section className="panel"><h2>Control de equipos alquilados</h2><label>Estado de devolución<select value={filter} onChange={e=>setFilter(e.target.value)}>{['Todos','Activo','Devolver en 30 días','Devolución vencida','Devuelto','Sin fecha'].map(s=><option key={s}>{s}</option>)}</select></label><div className="table-wrap"><table><thead><tr>{['Equipo','Proveedor / contrato','Responsable','Inicio','Devolución prevista','Valor / periodicidad','Mantenimiento','Estado'].map(s=><th key={s}>{s}</th>)}</tr></thead><tbody>{rows.map(a=><tr key={a.id}><td>{a.id}<small>{a.name}</small></td><td>{a.rentalSupplier}<small>{a.rentalContract||'Sin contrato registrado'}</small></td><td>{a.owner}</td><td>{formatDate(a.rentalStart||'')}</td><td>{formatDate(a.rentalReturnDue||'')}</td><td>{Number(a.rentalAmount||0).toLocaleString('es-CO',{style:'currency',currency:'COP'})}<small>{a.rentalPeriod}</small></td><td>{a.maintenanceResponsible}</td><td>{returnStatus(a,today)}</td></tr>)}{!rows.length&&<tr><td colSpan={8}>No hay equipos alquilados para este filtro.</td></tr>}</tbody></table></div></section>
}
