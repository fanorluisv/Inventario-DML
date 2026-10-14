import type { OwnerHistory } from './InventoryStore'
import { samePersonName } from './personNames.ts'
export type OwnerPeriod = { name:string; start:string; returned:string; current:boolean }
const person=(name:string)=>!!name&&name!=='Sin asignar'&&name!=='Sin registro previo'
function date(value:string){const parsed=new Date(value);return Number.isFinite(parsed.getTime())?new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Bogota'}).format(parsed):''}
export function ownerPeriods(code:string,owner:string,history:OwnerHistory[]):OwnerPeriod[]{
 // API history is newest first; reverse preserves the order of equal timestamps.
 const moves=history.filter(h=>h.codigo===code&&date(h.fecha)).slice().reverse()
 const rows:OwnerPeriod[]=[]
 for(const move of moves){
  const when=date(move.fecha)
  const last=rows.at(-1)
  if(last&&samePersonName(last.name,move.anterior)&&!last.returned)last.returned=when
  else if(person(move.anterior))rows.push({name:move.anterior,start:'',returned:when,current:false})
  if(person(move.nuevo))rows.push({name:move.nuevo,start:when,returned:'',current:false})
 }
 const last=rows.at(-1)
 if(person(owner)){
  if(last&&!last.returned&&samePersonName(last.name,owner)){last.current=true;last.name=owner}
  else rows.push({name:owner,start:'',returned:'',current:true})
 }
 return rows.reverse()
}
