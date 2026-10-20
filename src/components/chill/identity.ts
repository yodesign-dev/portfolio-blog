'use client'

// Tên của khách trong quán /chill — một tên dùng chung cho chat, bàn nhóm và bảng góp phin.
// Lưu trên máy (`chill:chat-me`, giữ khoá cũ của chat cho khách cũ khỏi mất tên). Lần đầu
// tạo sẵn một tên ngẫu nhiên kiểu Việt; khách đổi ở đâu (chat, bảng phin, màn chào) thì các
// chỗ khác nghe sự kiện `chill:me` mà đổi theo. Không tài khoản.

import {useEffect, useState} from 'react'

export const ME_KEY = 'chill:chat-me'
const TABLE_KEY = 'chill:table-me'
const EVENT = 'chill:me'
export const MAX_NAME = 24
export const NAME_COLORS = 8

export type Me = {uid: string; name: string; color: number}

export const NAMES = [
  'Mây Chiều', 'Phin Đen', 'Mèo Mướp', 'Gió Heo May', 'Bạc Xỉu', 'Hoa Sữa', 'Mưa Phùn', 'Đèn Lồng', 'Lá Me', 'Trà Đá',
  'Hạt Mưa', 'Ly Nâu', 'Phố Cổ', 'Sương Sớm', 'Cà Phê Muối', 'Hoàng Hôn', 'Bánh Mì', 'Nắng Nhạt', 'Hẻm Nhỏ', 'Trăng Khuyết',
]

const UID_RE = /^[a-z0-9]{8,32}$/i
const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)]

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}
function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Chặn storage — tên chỉ có trong lần xem này
  }
}

// Gọn khoảng trắng, cắt độ dài, bỏ đường link. Rỗng → null (giữ tên cũ)
export function cleanName(name: string) {
  const v = name.replace(/\s+/g, ' ').trim().slice(0, MAX_NAME)
  if (!v || /https?:|www\.|\.[a-z]{2,}\//i.test(v)) return null
  return v
}

// Danh tính trên máy này (tạo lần đầu). Đã có ở bàn nhóm thì dùng chung uid
export function loadMe(): Me {
  const saved = read<Me>(ME_KEY)
  if (saved && UID_RE.test(saved.uid) && typeof saved.name === 'string' && saved.name) return saved
  const table = read<{uid?: string; name?: string}>(TABLE_KEY)
  const uid = table?.uid && UID_RE.test(table.uid) ? table.uid : crypto.randomUUID().replace(/-/g, '').slice(0, 20)
  const me = {uid, name: pick(NAMES), color: Math.floor(Math.random() * NAME_COLORS)}
  write(ME_KEY, me)
  return me
}

// Đổi tên ở mọi nơi trong quán. Trả về tên đã lưu, hoặc null nếu tên không hợp lệ
export function renameMe(name: string): string | null {
  const clean = cleanName(name)
  if (!clean) return null
  const me = {...loadMe(), name: clean}
  write(ME_KEY, me)
  const table = read<Record<string, unknown>>(TABLE_KEY)
  if (table) write(TABLE_KEY, {...table, name: clean})
  window.dispatchEvent(new CustomEvent(EVENT, {detail: me}))
  return clean
}

// Nghe khi tên đổi ở chỗ khác trong quán
export function onMeChange(fn: (me: Me) => void) {
  const handler = (e: Event) => fn((e as CustomEvent<Me>).detail)
  window.addEventListener(EVENT, handler)
  return () => window.removeEventListener(EVENT, handler)
}

// Tên hiện tại (null tới khi đọc xong storage sau hydrate)
export function useMyName() {
  const [name, setName] = useState<string | null>(null)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- đọc localStorage sau khi hydrate
    setName(loadMe().name)
    return onMeChange((me) => setName(me.name))
  }, [])
  return name
}
