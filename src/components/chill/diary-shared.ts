// Bảng nhật ký của quán (/chill) — phần dùng chung cho API và giao diện.
//
// Mỗi ngày mỗi khách viết tối đa 2 mẩu giấy, mỗi mẩu 1–2 câu + 1 tâm trạng:
// - "Treo lên tường": mọi người thấy, quán giữ 7 ngày rồi dọn (api/chill-diary → Sanity)
// - "Cất vào sổ": chỉ lưu trên máy người viết, không gửi đi đâu
// Ngày tính theo giờ Hà Nội (cả quán dùng chung 1 mốc nửa đêm).

export const NOTE_MAX = 140
export const NOTE_MIN = 3
export const NOTES_PER_DAY = 2
export const KEEP_DAYS = 7

export const MOODS = ['calm', 'drive', 'heavy', 'sleepy', 'grateful'] as const
export type Mood = (typeof MOODS)[number]
export const isMood = (v: unknown): v is Mood => MOODS.includes(v as Mood)

export type DiaryNote = {
  id: string
  text: string
  mood: Mood
  name: string
  // Ngày viết theo giờ Hà Nội, YYYY-MM-DD
  day: string
  ts: number
}

const DAY_FORMAT = new Intl.DateTimeFormat('en-CA', {timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit'})

// YYYY-MM-DD theo giờ Hà Nội
export const dayOf = (ts: number) => DAY_FORMAT.format(new Date(ts))

// `n` ngày gần nhất (hôm nay trước), theo giờ Hà Nội
export function recentDays(n: number, now = Date.now()) {
  return Array.from({length: n}, (_, i) => dayOf(now - i * 86_400_000))
}

// Mẩu giấy của quán: mỗi ngày 1 câu cho cả quán, ký tên mèo. Giọng mộc, gắn với quán —
// không phải câu khẩu hiệu. Hết kho thì quay vòng; thêm câu ở cuối để không đổi câu
// của những ngày đã qua. Studio › Chill · Cài đặt có ô viết riêng cho ngày đặc biệt.
export const CAFE_NOTES: {vi: string; en: string}[] = [
  {vi: 'Phin đầu ngày bao giờ cũng chậm nhất. Cứ từ từ.', en: 'The first phin of the day is always the slowest. Take your time.'},
  {vi: 'Hôm nay làm xong một việc thôi cũng được rồi.', en: 'Finishing just one thing today is already enough.'},
  {vi: 'Ngoài phố vẫn ồn, trong quán vẫn yên. Ngồi xuống đi.', en: 'The street is loud, the café is quiet. Have a seat.'},
  {vi: 'Việc khó thì chia nhỏ ra. Phin cũng nhỏ từng giọt mà đầy ly.', en: 'Break the hard thing into small ones. A phin fills the cup one drop at a time.'},
  {vi: 'Mệt thì nghỉ một phin. Việc vẫn ở đó, không chạy đâu.', en: 'Tired? Rest for one phin. The work will still be here.'},
  {vi: 'Hôm qua chưa xong cũng không sao. Hôm nay pha phin mới.', en: 'Didn’t finish yesterday? That’s fine. Today we brew a fresh one.'},
  {vi: 'Mèo ngủ cả sáng mà chẳng ai trách. Bạn cũng đừng trách mình.', en: 'The cat slept all morning and nobody minded. Go easy on yourself too.'},
  {vi: 'Chưa biết bắt đầu từ đâu thì bắt đầu từ việc nhỏ nhất.', en: 'Not sure where to start? Start with the smallest thing.'},
  {vi: 'Trời mưa thì làm việc trong nhà. Ngày nào cũng có cách của nó.', en: 'If it rains, work indoors. Every day has its own way.'},
  {vi: 'Có người cũng đang ngồi làm việc như bạn. Bạn không một mình đâu.', en: 'Someone else is sitting down to work right now too. You’re not alone.'},
]

// Câu của quán cho 1 ngày (YYYY-MM-DD): cùng ngày thì ai cũng thấy cùng 1 câu
export function cafeNoteOf(day: string) {
  const days = Math.floor(Date.parse(`${day}T00:00:00Z`) / 86_400_000)
  return CAFE_NOTES[((days % CAFE_NOTES.length) + CAFE_NOTES.length) % CAFE_NOTES.length]
}
