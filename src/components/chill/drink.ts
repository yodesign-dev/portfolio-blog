// Món cà phê khách chọn — dùng chung cho ly dưới phin ngoài cảnh quán (scene.ts: setDrink)
// và ly trên bàn trong sổ nhật ký (Diary.tsx). Lưu trên máy, đổi ở đâu thì chỗ kia đổi theo.

import {useSyncExternalStore} from 'react'

export const DRINKS = ['den', 'sua', 'bacxiu'] as const
export type Drink = (typeof DRINKS)[number]

const KEY = 'chill:drink'
const listeners = new Set<() => void>()
// undefined = chưa đọc storage
let current: Drink | null | undefined

function read(): Drink | null {
  if (current !== undefined) return current
  current = null
  try {
    const saved = localStorage.getItem(KEY) as Drink | null
    if (saved && DRINKS.includes(saved)) current = saved
  } catch {
    // Chặn storage → chưa chọn món
  }
  return current
}

export function chooseDrink(drink: Drink) {
  current = drink
  try {
    localStorage.setItem(KEY, drink)
  } catch {
    // Chặn storage — món chỉ giữ trong lần xem này
  }
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

// null = chưa chọn (ly giữ nguyên như tranh gốc)
export function useDrink(): Drink | null {
  return useSyncExternalStore(subscribe, read, () => null)
}
