import { useContext, useEffect, useState, useSyncExternalStore } from 'react'
import type { Dispatch, SetStateAction } from 'react'

import { InventoryContext } from './InventoryContext'
const noSubscribe = () => () => {}
const noSnapshot = () => null

export function usePersistentState<T>(key: string, initial: T): [T, Dispatch<SetStateAction<T>>] {
  const store = useContext(InventoryContext)
  const snapshot = useSyncExternalStore(store?.subscribe || noSubscribe, store?.getSnapshot || noSnapshot)
  const [value, setValue] = useState<T>(() => {
    if (store) return initial
    try {
      const raw = localStorage.getItem(`dml-demo:${key}`)
      return raw ? JSON.parse(raw) as T : initial
    } catch {
      return initial
    }
  })
  useEffect(() => {
    if (store) return
    try { localStorage.setItem(`dml-demo:${key}`, JSON.stringify(value)) } catch { /* almacenamiento no disponible */ }
  }, [key, value, store])
  if (store && snapshot) return [snapshot.data[key] as T, action => store.set<T>(key, action)]
  return [value, setValue]
}
