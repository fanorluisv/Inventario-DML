export const assetPrefixes:Record<string,string>={Portátil:'LAP',Escritorio:'DES',Monitor:'MON',NAS:'NAS',Router:'RTR',Switch:'SWT','Cámara':'CAM',DVR:'DVR',NVR:'NVR',Impresora:'IMP',UPS:'UPS','Punto de acceso Wi-Fi':'AP'}
export function assetCode(type:string,sequence:number){return `DML-${assetPrefixes[type]}-${String(sequence).padStart(4,'0')}`}
export function demoEquipmentCode(index:number){return assetCode(index%2?'Portátil':'Escritorio',Math.floor(index/2)+1)}
