import { useState } from 'react'
import { formatDate, parseDate } from './dates'

type Props = { name: string; defaultValue?: string; required?: boolean; min?: string; max?: string }
export function DateField({ name, defaultValue = '', required, min, max }: Props) {
  const [text, setText] = useState(formatDate(defaultValue))
  const iso = text === formatDate(defaultValue) ? defaultValue : parseDate(text)
  const error = text && (!iso ? 'Escribe una fecha válida en formato dd/mm/aa.' : min && iso < min ? `La fecha mínima es ${formatDate(min)}.` : max && iso > max ? `La fecha máxima es ${formatDate(max)}.` : '')
  return <><input type="text" inputMode="numeric" placeholder="dd/mm/aa" aria-label={`${name}: dd/mm/aa`} required={required} maxLength={8} value={text}
    ref={element => { element?.setCustomValidity(error || '') }}
    onChange={event => setText(event.target.value)} />
    <input type="hidden" name={name} value={iso} /></>
}
