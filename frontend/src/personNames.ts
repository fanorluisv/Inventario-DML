export const personNameKey = (name: string) => name.trim().toLocaleLowerCase('es')
export const samePersonName = (left: string, right: string) => personNameKey(left) === personNameKey(right)
