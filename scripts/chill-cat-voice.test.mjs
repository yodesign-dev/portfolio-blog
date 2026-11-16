// Kiểm thử câu chào + nhịp độ của mèo /chill: node --test scripts/chill-cat-voice.test.mjs
// (Node 22.18+ tự bỏ kiểu TypeScript khi import file .ts)

import {test} from 'node:test'
import assert from 'node:assert/strict'
import {canSpeak, emptyLog, forcedGreeting, greetStyle, guideWait, logSpoken, pickGreeting, speakMs} from '../src/components/chill/cat-voice.ts'

const now = new Date(2026, 10, 16, 15, 0)
const days = (...d) => d.map((n) => `2026-11-${String(n).padStart(2, '0')}`)

test('khách lần đầu trong đời', () => {
  assert.equal(pickGreeting({days: [], total: 0}, now, 1, null), 'new')
})

test('lên cấp và thẻ đủ dấu ưu tiên hơn chuỗi ngày', () => {
  assert.equal(pickGreeting({days: days(14, 15), total: 2}, now, 3, null), 'lv3')
  assert.equal(pickGreeting({days: days(15), total: 6}, now, 2, null), 'lv7')
  assert.equal(pickGreeting({days: days(15), total: 29}, now, 2, null), 'lv30')
  assert.equal(pickGreeting({days: days(15), total: 19}, now, 2, null), 'card')
  assert.equal(pickGreeting({days: days(15), total: 39}, now, 2, null), 'card')
})

test('lâu không ghé, chuỗi ngày, các lần khác', () => {
  assert.equal(pickGreeting({days: days(9), total: 4}, now, 1, null), 'gap')
  assert.equal(pickGreeting({days: days(10), total: 4}, now, 1, null), 'back')
  assert.equal(pickGreeting({days: days(14, 15), total: 4}, now, 3, null), 'streak')
  assert.equal(pickGreeting({days: days(15), total: 1}, now, 2, null), 'streak')
  assert.equal(pickGreeting({days: days(12), total: 1}, now, 1, null), 'back')
})

test('lâu không ghé tính qua ranh tháng', () => {
  const dec = new Date(2026, 11, 3, 9, 0)
  assert.equal(pickGreeting({days: ['2026-11-25'], total: 4}, dec, 1, null), 'gap')
  assert.equal(pickGreeting({days: ['2026-11-27'], total: 4}, dec, 1, null), 'back')
})

test('quay lại trong cùng ngày chỉ chào khi đã vắng ≥ 2 giờ', () => {
  const b = {days: days(15, 16), total: 5}
  assert.equal(pickGreeting(b, now, 2, null), null)
  assert.equal(pickGreeting(b, now, 2, now.getTime() - 30 * 60_000), null)
  assert.equal(pickGreeting(b, now, 2, now.getTime() - 2 * 3_600_000), 'same')
})

test('kiểu diễn theo câu chào', () => {
  assert.equal(greetStyle('lv7'), 'hearts')
  assert.equal(greetStyle('gap'), 'stretch')
  assert.equal(greetStyle('same'), 'peek')
  assert.equal(greetStyle('new'), 'wave')
})

test('thời gian hiện bong bóng', () => {
  assert.equal(speakMs(''), 4500)
  assert.equal(speakMs('a'.repeat(10)), 5100)
  assert.equal(speakMs('a'.repeat(200)), 8000)
})

test('nhịp độ', () => {
  let log = emptyLog()
  const t = 100_000
  assert.equal(canSpeak(log, 'reply', t, true), true, 'reply luôn được nói')
  assert.equal(canSpeak(log, 'greet', t, true), false, 'đang nói thì chờ')
  assert.equal(canSpeak(log, 'greet', t, false), true)
  log = logSpoken(log, 'greet', t)
  assert.equal(canSpeak(log, 'greet', t + 999_999, false), false, 'chào 1 lần mỗi lần ghé')
  log = {...log, lastEnd: t + 5000}
  assert.equal(canSpeak(log, 'guide', t + 10_000, false), false, 'mời cách câu trước ≥ 20 s')
  assert.equal(guideWait(log, t + 10_000), 15_000)
  assert.equal(canSpeak(log, 'guide', t + 25_000, false), true)
  for (let i = 0; i < 3; i++) log = logSpoken(log, 'guide', t)
  assert.equal(canSpeak(log, 'guide', t + 999_999, false), false, 'tối đa 3 lời mời')
  assert.equal(canSpeak(log, 'play', t + 9000, false), false, 'chơi: cách câu trước ≥ 10 s')
  assert.equal(canSpeak(log, 'play', t + 16_000, false), true)
  log = logSpoken(log, 'play', t + 16_000)
  assert.equal(canSpeak(log, 'play', t + 50_000, false), false, 'câu chơi cách nhau ≥ 60 s')
  assert.equal(canSpeak(log, 'play', t + 77_000, false), true)
})

test('?catgreet chỉ nhận id hợp lệ', () => {
  assert.equal(forcedGreeting('?catgreet=lv7'), 'lv7')
  assert.equal(forcedGreeting('?catgreet=<script>'), null)
  assert.equal(forcedGreeting(''), null)
})
