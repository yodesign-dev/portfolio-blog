// Kiểm thử cache ngắn cho GET đọc Redis: node --test scripts/micro-cache.test.mjs
// (Node 22.18+ tự bỏ kiểu TypeScript khi import file .ts)

import {test} from 'node:test'
import assert from 'node:assert/strict'
import {microCache} from '../src/lib/microCache.ts'

test('trong ttl: chỉ gọi load 1 lần, request đồng thời dùng chung', async () => {
  let calls = 0
  const load = async () => {
    calls++
    await new Promise((r) => setTimeout(r, 20))
    return calls
  }
  const [a, b] = await Promise.all([microCache('t1', 1000, load), microCache('t1', 1000, load)])
  const c = await microCache('t1', 1000, load)
  assert.equal(calls, 1)
  assert.deepEqual([a, b, c], [1, 1, 1])
})

test('hết ttl: đọc lại', async () => {
  let calls = 0
  const load = async () => ++calls
  await microCache('t2', 10, load)
  await new Promise((r) => setTimeout(r, 25))
  assert.equal(await microCache('t2', 10, load), 2)
})

test('lỗi không bị giữ trong cache', async () => {
  let calls = 0
  const load = async () => {
    calls++
    if (calls === 1) throw new Error('redis down')
    return 'ok'
  }
  await assert.rejects(microCache('t3', 60_000, load))
  await new Promise((r) => setTimeout(r, 0))
  assert.equal(await microCache('t3', 60_000, load), 'ok')
})

test('khoá khác nhau không dùng chung', async () => {
  assert.equal(await microCache('t4a', 1000, async () => 'a'), 'a')
  assert.equal(await microCache('t4b', 1000, async () => 'b'), 'b')
})
