// Thẻ khách quen trang /chill: mỗi ngày ghé quán (đã qua màn chào) được 1 dấu, mỗi phin
// tập trung làm xong được đếm thêm. Tất cả chỉ lưu trên máy người xem — không tài khoản.

const KEY = 'chill:regular'
// Chỉ cần đủ dài để tính chuỗi ngày; tổng số ngày đếm riêng trong `total`
const KEEP_DAYS = 60
export const CARD_SLOTS = 10

export type Regular = {
  // Các ngày đã ghé gần đây (YYYY-MM-DD theo giờ máy), cũ → mới
  days: string[]
  // Tổng số ngày đã ghé từ trước tới giờ
  total: number
  // Số phin tập trung đã làm xong
  phins: number
  // Phin + số phút tập trung của riêng 1 ngày (sang ngày khác thì tính lại từ 0)
  today?: {day: string; phins: number; minutes: number}
}

export type RegularLevel = 'guest' | 'regular' | 'close' | 'family'

const EMPTY: Regular = {days: [], total: 0, phins: 0}

const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export function loadRegular(): Regular {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<Regular> | null
    if (!saved || !Array.isArray(saved.days)) return EMPTY
    const days = saved.days.filter((d) => typeof d === 'string')
    const t = saved.today
    const today =
      t && typeof t.day === 'string' ? {day: t.day, phins: Math.max(0, Number(t.phins) || 0), minutes: Math.max(0, Number(t.minutes) || 0)} : undefined
    return {days, total: Math.max(days.length, Number(saved.total) || 0), phins: Math.max(0, Number(saved.phins) || 0), today}
  } catch {
    return EMPTY
  }
}

function save(r: Regular) {
  try {
    localStorage.setItem(KEY, JSON.stringify(r))
  } catch {
    // Chặn storage — thẻ chỉ có trong lần xem này
  }
}

// Đóng dấu hôm nay. `fresh` = hôm nay chưa có dấu (lần ghé đầu tiên trong ngày)
export function stampToday(r: Regular, now = new Date()): {regular: Regular; fresh: boolean} {
  const today = dayKey(now)
  if (r.days.includes(today)) return {regular: r, fresh: false}
  const regular = {...r, days: [...r.days, today].slice(-KEEP_DAYS), total: r.total + 1}
  save(regular)
  return {regular, fresh: true}
}

// Phin + phút tập trung đã xong trong hôm nay
export function todayOf(r: Regular, now = new Date()) {
  return r.today?.day === dayKey(now) ? {phins: r.today.phins, minutes: r.today.minutes} : {phins: 0, minutes: 0}
}

export function addPhin(r: Regular, minutes: number, now = new Date()): Regular {
  const before = todayOf(r, now)
  const regular = {...r, phins: r.phins + 1, today: {day: dayKey(now), phins: before.phins + 1, minutes: before.minutes + minutes}}
  save(regular)
  return regular
}

// Số ngày ghé liên tiếp tính tới hôm nay (hôm nay chưa ghé thì tính tới hôm qua)
export function streakOf(r: Regular, now = new Date()) {
  const have = new Set(r.days)
  const d = new Date(now)
  if (!have.has(dayKey(d))) d.setDate(d.getDate() - 1)
  let n = 0
  while (have.has(dayKey(d))) {
    n += 1
    d.setDate(d.getDate() - 1)
  }
  return n
}

export function levelOf(total: number): RegularLevel {
  if (total >= 30) return 'family'
  if (total >= 7) return 'close'
  if (total >= 3) return 'regular'
  return 'guest'
}

// Thẻ đang đóng dở: số dấu trên thẻ hiện tại (1…10) và là thẻ thứ mấy
export function cardOf(total: number) {
  if (total <= 0) return {stamps: 0, card: 1}
  return {stamps: ((total - 1) % CARD_SLOTS) + 1, card: Math.floor((total - 1) / CARD_SLOTS) + 1}
}

// Hôm nay là ngày ghé thứ mấy (chưa đóng dấu hôm nay thì tính luôn hôm nay)
export function visitDayOf(r: Regular, now = new Date()) {
  return r.days.includes(dayKey(now)) ? r.total : r.total + 1
}
