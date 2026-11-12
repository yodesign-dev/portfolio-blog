// Kiểm thử "Bài của tôi" của /chill: node --test scripts/chill-favs.test.mjs
// (Node 22.18+ tự bỏ kiểu TypeScript khi import file .ts)

import {test} from 'node:test'
import assert from 'node:assert/strict'
import {MAX_FAVS, favList, parseFavs, toggleFav} from '../src/components/chill/favs.ts'

test('thả tim rồi bỏ tim', () => {
  const a = toggleFav({}, 'x', 100)
  assert.deepEqual(a, {x: 100})
  assert.deepEqual(toggleFav(a, 'x', 200), {})
})

test('danh sách xếp bài thả mới nhất trước', () => {
  let f = {}
  f = toggleFav(f, 'a', 1)
  f = toggleFav(f, 'b', 3)
  f = toggleFav(f, 'c', 2)
  assert.deepEqual(favList(f, ['a', 'b', 'c']), ['b', 'c', 'a'])
})

test('bài đã gỡ khỏi kho không hiện nhưng vẫn giữ trong bộ nhớ', () => {
  const f = {a: 1, gone: 2}
  assert.deepEqual(favList(f, ['a']), ['a'])
  assert.ok('gone' in parseFavs(f))
})

test('dữ liệu hỏng bị bỏ qua', () => {
  assert.deepEqual(parseFavs(null), {})
  assert.deepEqual(parseFavs([1, 2]), {})
  assert.deepEqual(parseFavs({ok: 5, bad: 'x', neg: -1, nan: NaN, '': 3}), {ok: 5})
})

test('đầy thì bài thả lâu nhất nhường chỗ', () => {
  let f = {}
  for (let i = 1; i <= MAX_FAVS; i++) f = toggleFav(f, `t${i}`, i)
  f = toggleFav(f, 'new', MAX_FAVS + 1)
  assert.equal(Object.keys(f).length, MAX_FAVS)
  assert.ok(!('t1' in f))
  assert.ok('new' in f)
})
