// Thử thách chung "Cả quán cùng pha phin" — kiểu dữ liệu dùng chung cho API
// (src/app/api/chill-quest/route.ts) và giao diện (QuestCard.tsx).
//
// Một mùa: phin của mọi khách cộng vào một con số chung → đủ mục tiêu thì mở bỏ phiếu
// vài ngày → hết hạn phiếu thì công bố lựa chọn thắng. Không xếp hạng, không điểm; chỉ ghi
// nhận mỗi khách đã góp bao nhiêu phin cho mùa (tên + số phin).

export type QuestPhase = 'brewing' | 'voting' | 'done'

export type QuestOption = {key: string; vi: string; en: string}

export type QuestState = {
  open: boolean
  season: string
  title: {vi: string; en: string}
  goal: number
  count: number
  phase: QuestPhase
  options: QuestOption[]
  // Lúc đóng phiếu (ms) — có khi đang bỏ phiếu hoặc đã xong
  voteEndsAt?: number
  // Chỉ có khi đã xong: số phiếu từng lựa chọn + lựa chọn thắng (hoà thì lấy cái đứng trước)
  votes?: Record<string, number>
  winner?: string
  // Khách đã góp phin trong mùa: tên + số phin, nhiều trước (tối đa PEOPLE_MAX người) và tổng
  // số người góp. Tên rỗng = khách chưa đặt / tên bị chặn → giao diện hiện "Một vị khách"
  people?: {name: string; n: number}[]
  peopleCount?: number
}

export const PEOPLE_MAX = 100

// Phin ngắn nhất 15 phút; chừa 1 phút cho đồng hồ lệch / máy ngủ
export const QUEST_MIN_PHIN_MS = 14 * 60_000

export const QUEST_UID_RE = /^[a-z0-9]{12,32}$/i
