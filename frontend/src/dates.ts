export function formatDate(value: string) {
  return value.replace(/^(\d{4})-(\d{2})-(\d{2})$/, (_, year, month, day) => `${day}/${month}/${year.slice(-2)}`)
}
export function parseDate(value: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{2})$/.exec(value)
  if (!match) return ''
  const [, day, month, year] = match
  const iso = `${Number(year) >= 70 ? '19' : '20'}${year}-${month}-${day}`
  const date = new Date(`${iso}T12:00:00Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === iso ? iso : ''
}
