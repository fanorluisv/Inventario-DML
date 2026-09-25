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
