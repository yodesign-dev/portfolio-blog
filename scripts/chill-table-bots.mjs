#!/usr/bin/env node
// Thả "bạn ảo" vào một bàn nhóm /chill để test (bàn đầy, "+n", ngủ gật, uống cà phê…).
//
//   node scripts/chill-table-bots.mjs <link mời hoặc mã bàn> [số người=3] [số phút=10]
//
// Ví dụ: node scripts/chill-table-bots.mjs "https://applebin.me/chill?table=ab12cd34" 5 15
//
// Mỗi bạn ảo có tên "Bot …", một nhân vật và một trạng thái riêng, gửi nhịp mỗi 45 giây
// để giữ ghế; trạng thái đổi vòng (đang làm → uống cà phê → ngủ gật → đi vắng) mỗi
// 2 phút. Hết giờ hoặc Ctrl+C là tất cả tự rời bàn. Bàn chỉ chạy khi Studio đang bật
// "Mở bàn nhóm"; số người tối đa theo "Số người tối đa mỗi bàn" trong Studio.

const [input, countArg = '3', minutesArg = '10'] = process.argv.slice(2)
if (!input) {
  console.error('Thiếu link mời. Dùng: node scripts/chill-table-bots.mjs <link mời> [số người] [số phút]')
  process.exit(1)
}

let origin = 'https://applebin.me'
let id = input.trim()
try {
  const url = new URL(input)
  origin = url.origin
  id = url.searchParams.get('table') ?? ''
} catch {
  // không phải URL → coi là mã bàn
}
if (!/^[a-z0-9]{8}$/.test(id)) {
  console.error(`Mã bàn không hợp lệ: "${id}"`)
  process.exit(1)
}

const count = Math.max(1, Math.min(10, Number(countArg) || 3))
const minutes = Math.max(1, Math.min(60, Number(minutesArg) || 10))
const API = `${origin}/api/chill-table`
const NAMES = ['Bot Mây', 'Bot Phin', 'Bot Sữa Đá', 'Bot Mưa', 'Bot Lá Me', 'Bot Trà Đá', 'Bot Hẻm', 'Bot Nắng', 'Bot Đèn', 'Bot Mèo']
const STATUSES = ['work', 'coffee', 'sleep', 'away']
const LABEL = {work: 'đang làm', coffee: 'uống cà phê', sleep: 'ngủ gật', away: 'đi vắng'}

const post = async (body) => {
  const res = await fetch(API, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)})
  return {status: res.status, data: await res.json().catch(() => ({}))}
}

const run = Date.now().toString(36).slice(-4)
const bots = Array.from({length: count}, (_, i) => ({
  uid: `zzbot${run}${String(i).padStart(2, '0')}x`,
  name: NAMES[i % NAMES.length],
  character: i % 6,
  status: STATUSES[i % STATUSES.length],
  joined: false,
}))

const joined = []
for (const bot of bots) {
  const {status, data} = await post({action: 'join', id, uid: bot.uid, name: bot.name, character: bot.character})
  if (status === 200) {
    bot.joined = true
    joined.push(bot)
    console.log(`✓ ${bot.name} vào bàn`)
  } else {
    console.log(`✗ ${bot.name}: ${data.error ?? `lỗi ${status}`}`)
    if (data.full) break
  }
}
if (!joined.length) process.exit(1)

const beat = async () => {
  for (const bot of joined) await post({action: 'beat', id, uid: bot.uid, status: bot.status}).catch(() => {})
}
await beat()
console.log(`\n${joined.length} bạn ảo đang ngồi bàn ${id} trong ${minutes} phút: ${joined.map((b) => `${b.name} (${LABEL[b.status]})`).join(', ')}`)
console.log('Ctrl+C để cho tất cả rời bàn ngay.\n')

const beatTimer = setInterval(beat, 45_000)
const rotateTimer = setInterval(() => {
  for (const bot of joined) bot.status = STATUSES[(STATUSES.indexOf(bot.status) + 1) % STATUSES.length]
  console.log(`↻ ${joined.map((b) => `${b.name}: ${LABEL[b.status]}`).join(' · ')}`)
  void beat()
}, 120_000)

const leave = async () => {
  clearInterval(beatTimer)
  clearInterval(rotateTimer)
  for (const bot of joined) await post({action: 'leave', id, uid: bot.uid}).catch(() => {})
  console.log('Các bạn ảo đã rời bàn.')
  process.exit(0)
}
process.on('SIGINT', leave)
setTimeout(leave, minutes * 60_000)
