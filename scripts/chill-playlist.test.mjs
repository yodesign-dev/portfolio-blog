// Kiểm thử hàm gợi ý nhạc của /chill: node --test scripts/chill-playlist.test.mjs
// (Node 22.18+ tự bỏ kiểu TypeScript khi import file .ts)

import {test} from 'node:test'
import assert from 'node:assert/strict'
import {moodPool, parsePrefs, suggestQueue, swapOne} from '../src/components/chill/playlist.ts'

const track = (id, station, duration = 180, mood = 'Steady', extra = {}) => ({id, title: id, mood, duration, station, ...extra})
const library = [
  ...Array.from({length: 12}, (_, i) => track(`focus-${i}`, 'focus')),
  ...Array.from({length: 6}, (_, i) => track(`lofi-${i}`, 'lofi')),
  ...Array.from({length: 6}, (_, i) => track(`study-${i}`, 'study')),
  ...Array.from({length: 6}, (_, i) => track(`acoustic-${i}`, 'acoustic')),
  ...Array.from({length: 4}, (_, i) => track(`night-${i}`, 'night', 480)),
]

// rand có hạt để kết quả lặp lại được
function seeded(seed) {
  let s = seed
  const next = () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
  // Mấy số đầu của các hạt gần nhau còn dính vào nhau, bỏ đi
  for (let i = 0; i < 8; i++) next()
  return next
}

test('bộ gợi ý vừa đủ độ dài phin, không dài thừa quá 1 bài', () => {
  for (const minutes of [15, 25, 45]) {
    const ids = suggestQueue({tracks: library, mood: 'surprise', minutes, rand: seeded(minutes)})
    const secs = ids.length * 180
    assert.ok(secs >= minutes * 60, `${minutes} phút: chỉ có ${secs} giây`)
    assert.ok(secs - 180 < minutes * 60, `${minutes} phút: thừa quá 1 bài`)
  }
})

test('không bài nào lặp trong một bộ', () => {
  const ids = suggestQueue({tracks: library, mood: 'surprise', minutes: 90, rand: seeded(1)})
  assert.equal(new Set(ids).size, ids.length)
})

test('gu chỉ lấy đúng trạm, Bất ngờ không bao giờ lấy trạm ngủ', () => {
  const deep = suggestQueue({tracks: library, mood: 'deep', minutes: 45, rand: seeded(2)})
  assert.ok(deep.every((id) => id.startsWith('focus') || id.startsWith('lofi')))
  assert.ok(moodPool(library, 'surprise').every((t) => t.station !== 'night'))
  const all = suggestQueue({tracks: library, mood: 'surprise', minutes: 9999, rand: seeded(3)})
  assert.ok(all.every((id) => !id.startsWith('night')))
})

test('thư viện không đủ thì trả hết, không treo', () => {
  const ids = suggestQueue({tracks: library.slice(0, 2), mood: 'deep', minutes: 120, rand: seeded(4)})
  assert.equal(ids.length, 2)
  assert.deepEqual(suggestQueue({tracks: [], mood: 'deep', minutes: 25}), [])
})

test('bài vừa nghe và bài bị bỏ qua ít được chọn hơn', () => {
  const count = (input) => {
    let hits = 0
    for (let i = 0; i < 400; i++) {
      if (suggestQueue({tracks: library, mood: 'deep', minutes: 6, rand: seeded(i + 10), ...input}).includes('focus-0')) hits++
    }
    return hits
  }
  const base = count({})
  assert.ok(count({recent: ['focus-0']}) < base / 3, 'bài vừa nghe vẫn hay được chọn')
  assert.ok(count({skips: {'focus-0': 3}}) < base / 3, 'bài bị bỏ qua vẫn hay được chọn')
})

test('đêm mưa ưu tiên bài êm trong gu, Bất ngờ thì không', () => {
  const tracks = [track('soft', 'focus', 180, 'Piano · Slow'), ...Array.from({length: 9}, (_, i) => track(`loud-${i}`, 'focus', 180, 'Upbeat'))]
  const first = (mood, weather) => {
    let hits = 0
    for (let i = 0; i < 2000; i++) {
      if (suggestQueue({tracks, mood, minutes: 1, weather, rand: seeded(i + 5)})[0] === 'soft') hits++
    }
    return hits
  }
  assert.ok(first('deep', 'rain') > first('deep', 'clear') * 1.2)
  assert.ok(Math.abs(first('surprise', 'rain') - first('surprise', 'clear')) < 1)
})

test('exclude đổi được cả bộ, hết bài khác thì dùng lại', () => {
  const a = suggestQueue({tracks: library, mood: 'gentle', minutes: 9, rand: seeded(6)})
  const b = suggestQueue({tracks: library, mood: 'gentle', minutes: 9, exclude: a, rand: seeded(7)})
  assert.ok(b.every((id) => !a.includes(id)))
  const allIds = moodPool(library, 'gentle').map((t) => t.id)
  assert.ok(suggestQueue({tracks: library, mood: 'gentle', minutes: 9, exclude: allIds, rand: seeded(8)}).length > 0)
})

test('đổi 1 bài chỉ đổi đúng vị trí đó', () => {
  const ids = ['focus-0', 'focus-1', 'focus-2']
  const next = swapOne(ids, 1, {tracks: library, mood: 'deep', rand: seeded(9)})
  assert.equal(next[0], 'focus-0')
  assert.equal(next[2], 'focus-2')
  assert.notEqual(next[1], 'focus-1')
  assert.ok(!ids.includes(next[1]))
  assert.deepEqual(swapOne(ids, 1, {tracks: library.slice(0, 3), mood: 'deep'}), ids)
})

test('đọc prefs hỏng hoặc thiếu vẫn ra bản dùng được', () => {
  const names = ['A', 'B', 'C']
  assert.equal(parsePrefs(null, names).lists.length, 3)
  const p = parsePrefs({source: 'x', mood: 'y', active: 9, mix: 'z', breakMode: 1, lists: [{name: '', ids: ['a', 2]}, 'bad']}, names)
  assert.equal(p.source, null)
  assert.equal(p.mood, 'deep')
  assert.equal(p.active, 0)
  assert.equal(p.mix, 'scene')
  assert.equal(p.breakMode, 'duck')
  assert.deepEqual(p.lists[0], {name: 'A', ids: ['a']})
  assert.deepEqual(p.lists[1], {name: 'B', ids: []})
})

test('bài có lời không vào gợi ý ở mood nào, bài không lời cùng trạm vẫn vào', () => {
  const lib = [
    ...library,
    ...Array.from({length: 4}, (_, i) => track(`throwback-${i}`, 'throwback')),
    ...Array.from({length: 3}, (_, i) => track(`throwback-vocal-${i}`, 'throwback', 180, 'AI vocal · Ballad', {vocals: true})),
  ]
  for (const mood of ['deep', 'gentle', 'melodic', 'surprise']) {
    assert.ok(moodPool(lib, mood).every((t) => !t.vocals), `${mood}: lọt bài có lời`)
    const ids = suggestQueue({tracks: lib, mood, minutes: 9999, rand: seeded(7)})
    assert.ok(ids.every((id) => !id.startsWith('throwback-vocal')), `${mood}: bộ gợi ý có bài có lời`)
  }
  assert.ok(moodPool(lib, 'melodic').some((t) => t.station === 'throwback'))
  assert.ok(moodPool(lib, 'surprise').some((t) => t.station === 'throwback'))
})

test('trạm mới mở = mọi bài trong trạm đều còn nhãn Mới', async () => {
  const {newStations} = await import('../src/components/chill/tracks.ts')
  const lib = [
    track('a', 'throwback', 180, 'x', {isNew: true}),
    track('b', 'throwback', 180, 'x', {isNew: true}),
    track('c', 'lofi', 180, 'x', {isNew: true}),
    track('d', 'lofi'),
    track('e', 'focus'),
  ]
  assert.deepEqual([...newStations(lib)], ['throwback'])
  assert.equal(newStations([]).size, 0)
})
