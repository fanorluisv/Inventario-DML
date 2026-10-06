export function nextMaintenance(date: string): string {
 if (!date) return ''
 const [y,m,d]=date.split('-').map(Number)
 const target=new Date(Date.UTC(y,m-1+6,1))
 const last=new Date(Date.UTC(target.getUTCFullYear(),target.getUTCMonth()+1,0)).getUTCDate()
 target.setUTCDate(Math.min(d,last))
 return target.toISOString().slice(0,10)
}
export function assignSeat(ids:string[],equipmentId:string,quantity:number):string[] {
 if(!equipmentId||ids.includes(equipmentId)||ids.length>=quantity) return ids
 return [...ids,equipmentId]
}
export function licenseExpiration(acquired: string, years: number): string {
 if (!/^\d{4}-\d{2}-\d{2}$/.test(acquired) || !Number.isSafeInteger(years) || years < 1 || years > 100) return ''
 const date = new Date(`${acquired}T12:00:00Z`)
 if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0,10) !== acquired) return ''
 const year = date.getUTCFullYear() + years
 if (year > 9999) return ''
 const month = date.getUTCMonth()
 const last = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
 date.setUTCDate(1); date.setUTCFullYear(year); date.setUTCDate(Math.min(Number(acquired.slice(8)), last))
 return date.toISOString().slice(0,10)
}
