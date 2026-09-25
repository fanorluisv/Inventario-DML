export const identificationKey = (value: string) => value.replace(/[\s.-]/g, '').toUpperCase()
export const serialKey = (value: string) => value.replace(/\s/g, '').toUpperCase()
