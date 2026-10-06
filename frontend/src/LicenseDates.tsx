import { useState } from 'react'
import { DateField } from './DateField'
import { formatDate } from './dates'
import { licenseExpiration } from './inventoryRules'
import type { License } from './inventoryData'

export function LicenseDates({ license, modality, today }: { license: License | null; modality: string; today: string }) {
  const [acquired, setAcquired] = useState(license?.acquired || '')
  // Keep the recorded expiry of existing licenses until a period is selected.
  const [period, setPeriod] = useState(license ? String(license.periodYears || '') : '1')
  const subscription = modality === 'Suscripción'
  const expires = subscription && period ? licenseExpiration(acquired, Number(period)) : ''
  return <>
    <label>Fecha de adquisición / inicio<DateField name="acquired" defaultValue={license?.acquired || ''} max={today} required={subscription && !!period} onChange={setAcquired}/></label>
    {subscription && <><label>Período de licencia (años)<input name="periodYears" type="number" min="1" max="100" step="1" value={period} required={!license} placeholder="Ej. 1, 2, 3…" onChange={event => setPeriod(event.target.value)}/></label>
      {period ? <label>Vencimiento calculado<input readOnly value={formatDate(expires)} placeholder="Completa la fecha de inicio"/><input type="hidden" name="expires" value={expires}/></label> : <label>Vencimiento registrado<DateField name="expires" defaultValue={license?.expires || ''}/></label>}
      <p className="full-width">El vencimiento corresponde a la fecha de inicio más el período en años. {license && !period ? 'Selecciona un período para calcularlo; mientras tanto se conserva la fecha registrada.' : 'Para corregirlo, modifica la fecha de inicio o el período.'}</p>
    </>}
  </>
}
