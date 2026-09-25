export type AccessoryStock={id:string;name:string;brand:string;quantity:number}
export type AccessoryAssignment={id:string;stockId:string;equipmentId:string;responsible:string;quantity:number;date:string;returned:string;deliveryId:string}
export type AccessoryInventory={stock:AccessoryStock[];assignments:AccessoryAssignment[]}
export const available=(inventory:AccessoryInventory,id:string)=>{const stock=inventory.stock.find(s=>s.id===id);return (stock?.quantity||0)-inventory.assignments.filter(a=>a.stockId===id&&!a.returned).reduce((n,a)=>n+a.quantity,0)}
