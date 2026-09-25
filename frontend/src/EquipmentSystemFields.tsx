import { useState } from 'react'

type EquipmentSystem = { os: string; osLicensed?: boolean; gpu: string; gpuReference?: string }
export function EquipmentSystemFields({ existing, operatingSystems }: { existing: EquipmentSystem | null; operatingSystems: string[] }) {
  const [gpu, setGpu] = useState(existing?.gpu || 'Por confirmar')
  const [licensed, setLicensed] = useState(existing?.osLicensed === true)
  const dedicated = gpu === 'Dedicada' || gpu === 'Integrada y dedicada'
  const systems = [...new Set([...operatingSystems, 'Windows 11 Pro', 'Windows 11 Home', 'Windows 10 Pro', 'Windows 10 Home', 'Windows Server', 'Ubuntu', 'Debian', 'Linux', 'macOS', 'Synology DSM', 'QNAP QTS', 'TrueNAS', 'Sin sistema operativo'])].filter(Boolean).sort((a,b)=>a.localeCompare(b,'es'))
  return <>
    <label>Sistema operativo<input name="os" list="equipment-operating-systems" defaultValue={existing?.os || ''} maxLength={120} placeholder="Escribe para filtrar o agregar otro…" autoComplete="off"/><datalist id="equipment-operating-systems">{systems.map(os=><option key={os} value={os}/>)}</datalist></label>
    <label>Sistema operativo licenciado<input name="osLicensed" type="checkbox" checked={licensed} onChange={e=>setLicensed(e.target.checked)}/><span>{licensed?'Sí':'No'}</span></label>
    <label>Tipo de tarjeta de video<select name="gpu" value={gpu} onChange={e=>setGpu(e.target.value)}><option>Por confirmar</option><option>Integrada</option><option>Dedicada</option><option>Integrada y dedicada</option></select></label>
    {dedicated&&<label>Referencia de la tarjeta dedicada<input name="gpuReference" required maxLength={120} defaultValue={existing?.gpuReference||''} placeholder="Ej. NVIDIA GeForce RTX 4060"/></label>}
  </>
}
