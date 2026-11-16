// Mèo trò chuyện trang /chill (công tắc Studio catTalkOpen): chọn câu chào khi khách vào quán
// và luật nhịp độ để mèo không nói nhiều. Hàm thuần, không React — test bằng
// node --test scripts/chill-cat-voice.test.mjs (file này không import gì để Node chạy thẳng .ts).
//
// Loại câu:
//   reply — đáp lại việc khách vừa làm (xong phin, cảm ơn, mèo về…): luôn được nói, như trước
//   greet — chào lúc vào quán: 1 lần mỗi lần ghé
//   guide — lời mời làm quen (guide.ts) do mèo nói: theo giới hạn của guide.ts, cách câu trước ≥ 20 s
//   play  — lúc vuốt / chơi cần câu: các câu cách nhau ≥ 60 s, không đọc lên trình đọc màn hình

export type VoiceKind = 'reply' | 'greet' | 'guide' | 'play'

// new: lần đầu trong đời · lv3/lv7/lv30: lên Khách quen / Khách ruột / Người nhà · card: thẻ đủ
// 10 dấu · gap: ≥ 7 ngày không ghé · streak: ≥ 2 ngày liền · back: các lần khác · same: quay
// lại trong cùng ngày sau ≥ 2 giờ vắng
export type GreetId = 'new' | 'lv3' | 'lv7' | 'lv30' | 'card' | 'gap' | 'streak' | 'back' | 'same'
export const GREET_IDS: GreetId[] = ['new', 'lv3', 'lv7', 'lv30', 'card', 'gap', 'streak', 'back', 'same']

export const GAP_DAYS = 7
export const SAME_DAY_AWAY_MS = 2 * 3_600_000
// Câu chào chờ được nói (bảng đang mở, đang Ngắm cảnh…) tối đa bấy lâu, quá thì bỏ
export const GREET_WAIT_MS = 60_000
export const GUIDE_GAP_MS = 20_000
export const PLAY_GAP_MS = 60_000
// Câu khi chơi cũng phải cách câu trước (bất kỳ loại nào) bấy lâu
export const PLAY_AFTER_ANY_MS = 10_000

const dayNum = (key: string) => {
  const [y, m, d] = key.split('-').map(Number)
  return Math.round(Date.UTC(y, m - 1, d) / 86_400_000)
}
const keyOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

// `before` = thẻ khách quen TRƯỚC khi đóng dấu hôm nay (regular.ts), `streak` = số ngày liền
// SAU khi đóng dấu, `lastSeen` = lần cuối khách còn ở quán (ms, xem loadLastSeen)
export function pickGreeting(before: {days: string[]; total: number}, now: Date, streak: number, lastSeen: number | null): GreetId | null {
  const today = keyOf(now)
  if (before.days.includes(today)) {
    return lastSeen !== null && now.getTime() - lastSeen >= SAME_DAY_AWAY_MS ? 'same' : null
  }
  if (before.total <= 0) return 'new'
  const visit = before.total + 1
  if (visit === 3) return 'lv3'
  if (visit === 7) return 'lv7'
  if (visit === 30) return 'lv30'
  if (visit % 10 === 0) return 'card'
  const last = before.days[before.days.length - 1]
  if (last && dayNum(today) - dayNum(last) >= GAP_DAYS) return 'gap'
  if (streak >= 2) return 'streak'
  return 'back'
}

// Mèo diễn gì khi chào: vẫy chân, vẫy chân + tim (lên cấp / đủ thẻ), vươn vai rồi vẫy (lâu
// không gặp), chỉ ngẩng lên nhìn (quay lại trong ngày)
export type GreetStyle = 'wave' | 'hearts' | 'stretch' | 'peek'
export function greetStyle(id: GreetId): GreetStyle {
  if (id === 'lv3' || id === 'lv7' || id === 'lv30' || id === 'card') return 'hearts'
  if (id === 'gap') return 'stretch'
  if (id === 'same') return 'peek'
  return 'wave'
}

// Thời gian bong bóng nằm trên màn hình: 4,5 s + 60 ms mỗi ký tự, tối đa 8 s
export function speakMs(text: string) {
  return Math.min(8000, 4500 + 60 * [...text].length)
}

export type VoiceLog = {greet: number; guide: number; lastPlay: number; lastEnd: number}
export const emptyLog = (): VoiceLog => ({greet: 0, guide: 0, lastPlay: -Infinity, lastEnd: -Infinity})

// Được nói câu loại `kind` lúc `now` không. `speaking` = mèo đang có bong bóng trên màn hình
export function canSpeak(log: VoiceLog, kind: VoiceKind, now: number, speaking: boolean, guideMax = 3): boolean {
  if (kind === 'reply') return true
  if (speaking) return false
  if (kind === 'greet') return log.greet < 1
  if (kind === 'guide') return log.guide < guideMax && now - log.lastEnd >= GUIDE_GAP_MS
  return now - log.lastPlay >= PLAY_GAP_MS && now - log.lastEnd >= PLAY_AFTER_ANY_MS
}

// Ghi lại 1 câu vừa nói (lúc bắt đầu hiện)
export function logSpoken(log: VoiceLog, kind: VoiceKind, now: number): VoiceLog {
  if (kind === 'greet') return {...log, greet: log.greet + 1}
  if (kind === 'guide') return {...log, guide: log.guide + 1}
  if (kind === 'play') return {...log, lastPlay: now}
  return log
}

// Còn phải đợi bao lâu (ms) trước khi mèo được nói câu mời làm quen tiếp theo
export function guideWait(log: VoiceLog, now: number) {
  return Math.max(0, log.lastEnd + GUIDE_GAP_MS - now)
}

// Lần cuối khách còn ở quán (rời tab / đóng trang) — để biết "quay lại trong ngày sau 2 giờ".
// Khoá riêng, không nằm trong thẻ khách quen để khỏi bị bản cũ trong state ghi đè
const SEEN_KEY = 'chill:last-seen'

export function loadLastSeen(): number | null {
  try {
    const n = Number(localStorage.getItem(SEEN_KEY))
    return Number.isFinite(n) && n > 0 ? n : null
  } catch {
    return null
  }
}

export function saveLastSeen(at = Date.now()) {
  try {
    localStorage.setItem(SEEN_KEY, String(at))
  } catch {
    // Chặn storage — chỉ mất câu "quay lại trong ngày"
  }
}

// ?catgreet=new|lv3|… → giả lập câu chào để thử (không đổi dữ liệu trên máy)
export function forcedGreeting(search: string): GreetId | null {
  const v = new URLSearchParams(search).get('catgreet')
  return GREET_IDS.find((g) => g === v) ?? null
}
