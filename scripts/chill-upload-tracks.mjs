#!/usr/bin/env node
// Đưa nhạc mới lên Sanity ("Chill · Nhạc") theo một file danh sách JSON.
//
//   node --env-file=.env.local scripts/chill-upload-tracks.mjs .chill-video/acoustic-new/tracks.json          # xem trước
//   node --env-file=.env.local scripts/chill-upload-tracks.mjs .chill-video/acoustic-new/tracks.json --write  # làm thật
//
// File danh sách: [{"file": "final/hue-morning-rain.m4a", "title": "Hue Morning Rain",
//   "mood": "Fingerstyle guitar · Rain", "station": "acoustic", "order": 55, "hidden": false}, ...]
// Đường dẫn `file` tính từ thư mục chứa file danh sách. Mã bài = <trạm>-<tên bài viết thường>,
// _id = chillTrack-<mã bài> (giống các bài sẵn có). Bài đã có _id đó thì bỏ qua, chạy lại thoải mái.

import fs from 'node:fs'
import path from 'node:path'
import {execFileSync} from 'node:child_process'
import {createClient} from '@sanity/client'

const [listFile] = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const write = process.argv.includes('--write')
if (!listFile) {
  console.error('Thiếu file danh sách. Dùng: node --env-file=.env.local scripts/chill-upload-tracks.mjs <tracks.json> [--write]')
  process.exit(1)
}
if (!process.env.SANITY_API_WRITE_TOKEN) {
  console.error('Thiếu SANITY_API_WRITE_TOKEN (chạy với --env-file=.env.local)')
  process.exit(1)
}

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_API_WRITE_TOKEN,
  useCdn: false,
})

const STATIONS = ['acoustic', 'focus', 'sax', 'lofi', 'study']
const FFMPEG = process.env.FFMPEG || 'ffmpeg'
const slug = (s) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

// Thời lượng (giây) đọc từ ffmpeg; không có ffmpeg thì để trống, trang tự đọc khi phát
function seconds(file) {
  try {
    execFileSync(FFMPEG, ['-hide_banner', '-i', file], {stdio: 'pipe'})
  } catch (err) {
    const m = /Duration: (\d+):(\d+):(\d+(?:\.\d+)?)/.exec(String(err.stderr))
    if (m) return Math.round(Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]))
  }
  return undefined
}

const dir = path.dirname(path.resolve(listFile))
const list = JSON.parse(fs.readFileSync(listFile, 'utf8'))

let added = 0
for (const t of list) {
  const file = path.resolve(dir, t.file)
  if (!STATIONS.includes(t.station)) throw new Error(`Trạm không có: ${t.station} (${t.title})`)
  if (!fs.existsSync(file)) throw new Error(`Không thấy file: ${file}`)
  const key = `${t.station}-${slug(t.title)}`
  const _id = `chillTrack-${key}`
  if (await client.getDocument(_id)) {
    console.log(`✓ ${t.title.padEnd(24)} đã có (${_id})`)
    continue
  }
  const duration = seconds(file)
  console.log(`${write ? '↑' : '·'} ${t.title.padEnd(24)} ${t.station} · ${t.mood} · ${duration ?? '?'}s · thứ tự ${t.order}${t.hidden ? ' · ẩn' : ''}`)
  if (!write) continue
  const asset = await client.assets.upload('file', fs.createReadStream(file), {filename: `${key}${path.extname(file)}`})
  await client.createIfNotExists({
    _id,
    _type: 'chillTrack',
    title: t.title,
    key: {_type: 'slug', current: key},
    station: t.station,
    mood: t.mood,
    duration,
    order: t.order,
    hidden: Boolean(t.hidden),
    audio: {_type: 'file', asset: {_type: 'reference', _ref: asset._id}},
  })
  added++
}
console.log(write ? `\nĐã thêm ${added} bài.` : '\nXem trước xong. Thêm --write để đưa lên thật.')
