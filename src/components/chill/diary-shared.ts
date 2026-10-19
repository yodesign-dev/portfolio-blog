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

// Câu hỏi của quán: mỗi ngày quán hỏi cả quán 1 câu, mẩu giấy của ngày đó là câu trả lời.
// Trang giấy trắng thì khó viết, 1 câu hỏi cụ thể thì dễ — và đọc mẩu của người khác cũng
// có ngữ cảnh. Câu phải trả lời được bằng 1–2 câu, không cần suy nghĩ lâu. Hết kho thì quay
// vòng; thêm câu ở cuối để không đổi câu của những ngày đã qua.
export const CAFE_QUESTIONS: {vi: string; en: string}[] = [
  {vi: 'Tâm trạng bạn lúc này thế nào? Bực, vui hay khó chịu, cứ để lại đây cho nhẹ.', en: 'How are you feeling right now? Fed up, happy or on edge, leave it here and breathe.'},
  {vi: 'Hôm nay bạn đang né việc gì?', en: 'What are you putting off today?'},
  {vi: 'Việc nhỏ nào hôm nay làm bạn thấy dễ chịu?', en: 'What small thing felt good today?'},
  {vi: 'Bạn ngồi xuống đây để làm xong việc gì?', en: 'What did you sit down here to finish?'},
  {vi: 'Điều gì đang ở trong đầu bạn mà chưa nói với ai?', en: 'What’s on your mind that you haven’t told anyone?'},
  {vi: 'Hôm nay bạn muốn cảm ơn ai?', en: 'Who do you want to thank today?'},
  {vi: 'Nếu hôm nay chỉ làm được một việc, đó là việc gì?', en: 'If you could get only one thing done today, what would it be?'},
  {vi: 'Lần gần nhất bạn thấy mình làm tốt là khi nào?', en: 'When did you last feel you did well?'},
  {vi: 'Bạn muốn nói gì với chính mình của sáng nay?', en: 'What would you tell this morning’s you?'},
  {vi: 'Điều gì đang làm bạn chậm lại?', en: 'What’s slowing you down?'},
  {vi: 'Xong việc hôm nay, bạn thưởng cho mình cái gì?', en: 'What’s your treat once today’s work is done?'},
]

// Quán bắt đầu hỏi từ ngày này — mẩu của những ngày trước đó không phải câu trả lời cho câu nào
const QUESTIONS_FROM = '2026-10-14'

// Câu hỏi của 1 ngày (YYYY-MM-DD), null = ngày đó quán chưa hỏi. Ngày đầu tiên hỏi câu đầu kho.
export function cafeQuestionOf(day: string) {
  if (!day || day < QUESTIONS_FROM) return null
  const since = Math.round((Date.parse(`${day}T00:00:00Z`) - Date.parse(`${QUESTIONS_FROM}T00:00:00Z`)) / 86_400_000)
  return CAFE_QUESTIONS[since % CAFE_QUESTIONS.length]
}

// Câu danh ngôn của hôm nay: tờ giấy in dán trong sổ, tiếng Anh lớn + tiếng Việt nhỏ (cố định
// thứ tự, không theo ngôn ngữ đang xem). Chủ đề: mục tiêu, bắt đầu, bền bỉ. Chỉ lấy câu có
// nguồn rõ (sách, thư, tục ngữ) — nhiều "danh ngôn" trên mạng bị gán nhầm tác giả. Bản tiếng
// Anh của tác giả cổ là bản dịch tự viết, không chép bản dịch có bản quyền.
// Studio › Chill · Cài đặt có ô ghi đè cho ngày đặc biệt.
export type Quote = {en: string; vi: string; by: string}
export const CAFE_QUOTES: Quote[] = [
  // Mục tiêu
  {en: 'If you don’t know which port you’re sailing to, no wind is the right wind.', vi: 'Không biết mình đi về bến nào thì chẳng ngọn gió nào là thuận.', by: 'Seneca'},
  {en: 'First tell yourself who you want to be, then do what you have to do.', vi: 'Trước hết hãy nói với mình bạn muốn trở thành ai, rồi làm những gì cần làm.', by: 'Epictetus'},
  {en: 'If you have built castles in the air, your work need not be lost; that is where they should be. Now put the foundations under them.', vi: 'Nếu bạn đã xây lâu đài trên mây thì đừng tiếc, đó đúng là chỗ của nó. Giờ hãy xây móng bên dưới.', by: 'Henry David Thoreau'},
  {en: 'A craftsman who wants to do good work must first sharpen his tools.', vi: 'Người thợ muốn làm việc cho khéo, trước hết phải mài sắc đồ nghề.', by: 'Confucius · Khổng Tử'},
  {en: 'Do what you can, with what you have, where you are.', vi: 'Làm những gì bạn có thể, bằng những gì bạn có, ngay tại nơi bạn đứng.', by: 'Theodore Roosevelt'},
  {en: 'Trust yourself: every heart vibrates to that iron string.', vi: 'Hãy tin chính mình: trái tim nào cũng rung theo sợi dây ấy.', by: 'Ralph Waldo Emerson'},
  // Bắt đầu
  {en: 'A journey of a thousand miles begins with a single step.', vi: 'Hành trình vạn dặm bắt đầu từ một bước chân.', by: 'Lao Tzu · Lão Tử'},
  {en: 'Well begun is half done.', vi: 'Bắt đầu được là đã xong một nửa.', by: 'Horace'},
  {en: 'While we put things off, life speeds by.', vi: 'Trong lúc ta còn hẹn lần lữa, đời đã trôi qua.', by: 'Seneca'},
  {en: 'Stop arguing about what a good person should be. Be one.', vi: 'Đừng mất thời gian bàn người tốt phải ra sao nữa. Hãy là người đó.', by: 'Marcus Aurelius'},
  {en: 'Well done is better than well said.', vi: 'Làm tốt hơn nói hay.', by: 'Benjamin Franklin'},
  {en: 'He who conquers others is strong; he who conquers himself is mighty.', vi: 'Thắng người là có sức, thắng mình mới là mạnh.', by: 'Lao Tzu · Lão Tử'},
  // Bền bỉ
  {en: 'Dripping water hollows out stone.', vi: 'Nước nhỏ giọt mãi cũng mòn đá.', by: 'Ovid'},
  {en: 'No great thing is created suddenly, any more than a bunch of grapes or a fig.', vi: 'Không điều gì lớn lao thành ra trong chốc lát, như chùm nho hay trái vả cũng vậy.', by: 'Epictetus'},
  {en: 'Great things are not done by impulse, but by a series of small things brought together.', vi: 'Việc lớn không làm bằng một phút bốc đồng, mà bằng nhiều việc nhỏ góp lại.', by: 'Vincent van Gogh'},
  {en: 'Genius is one percent inspiration and ninety-nine percent perspiration.', vi: 'Thiên tài là 1% cảm hứng và 99% mồ hôi.', by: 'Thomas Edison'},
  {en: 'Grind an iron bar long enough and it becomes a needle.', vi: 'Có công mài sắt, có ngày nên kim.', by: 'Vietnamese proverb · Tục ngữ'},
  {en: 'Carry it bit by bit, and the ant fills its nest.', vi: 'Kiến tha lâu cũng đầy tổ.', by: 'Vietnamese proverb · Tục ngữ'},
  {en: 'Failure is the mother of success.', vi: 'Thất bại là mẹ thành công.', by: 'Proverb · Tục ngữ'},
  {en: 'Nothing is truly hard, only a heart that won’t hold on.', vi: 'Không có việc gì khó, chỉ sợ lòng không bền.', by: 'Hồ Chí Minh'},
]

// Xáo kho câu theo 1 hạt giống cố định (mulberry32) — cùng hạt thì cùng thứ tự trên mọi máy
function shuffled(n: number, seed: number) {
  let s = seed >>> 0
  const rand = () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const order = Array.from({length: n}, (_, i) => i)
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[order[i], order[j]] = [order[j], order[i]]
  }
  return order
}

// Câu của 1 ngày (YYYY-MM-DD): cùng ngày thì ai cũng thấy cùng 1 câu. Mỗi vòng (= số câu
// trong kho) xáo lại 1 lần nên trông như ngẫu nhiên mà không lặp câu trước khi hết kho, và
// không lặp câu ở chỗ nối 2 vòng. Sổ chỉ hiện câu của hôm nay nên thêm câu vào kho (đổi
// thứ tự) cũng không sao.
export function cafeQuoteOf(day: string): Quote {
  const n = CAFE_QUOTES.length
  const days = Math.floor(Date.parse(`${day}T00:00:00Z`) / 86_400_000)
  const round = Math.floor(days / n)
  const order = shuffled(n, round)
  const prevLast = shuffled(n, round - 1)[n - 1]
  if (order[0] === prevLast) [order[0], order[1]] = [order[1], order[0]]
  return CAFE_QUOTES[order[((days % n) + n) % n]]
}
