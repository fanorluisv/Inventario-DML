import { createContext, useContext } from 'react'
import type { InventoryStore } from './InventoryStore'
export const InventoryContext = createContext<InventoryStore | null>(null)
export function useInventoryMode() {
  const store = useContext(InventoryContext)
  return { store, operational: !!store, canWrite: !store || store.session.user.rol !== 'lector', admin: !store || store.session.user.rol === 'administrador_ti' }
}
