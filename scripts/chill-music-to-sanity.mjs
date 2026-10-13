#!/usr/bin/env node
// Chuyển nhạc /chill từ public/chill/music/ lên Sanity CDN để deployment Vercel nhẹ đi
// (63MB nhạc × mỗi lần deploy). Với mỗi bài "Chill · Nhạc" còn dùng "File có sẵn trên
// web" (localFile) mà chưa có "File nhạc": upload file → gắn vào `audio` → bỏ `localFile`.
//
//   node --env-file=.env.local scripts/chill-music-to-sanity.mjs          # xem trước, không ghi
//   node --env-file=.env.local scripts/chill-music-to-sanity.mjs --write  # làm thật
//
// Chạy lại bao nhiêu lần cũng được — bài đã có `audio` thì bỏ qua.

import fs from 'node:fs'
import path from 'node:path'
import {createClient} from '@sanity/client'

const write = process.argv.includes('--write')
const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_API_WRITE_TOKEN,
  useCdn: false,
})

const docs = await client.fetch(
  `*[_type == "chillTrack"] | order(_id asc) {_id, title, "key": key.current, localFile, hidden, "url": audio.asset->url}`,
  {},
  {perspective: 'raw'},
)
console.log(`${docs.length} bản ghi chillTrack (kể cả nháp)\n`)

let moved = 0
for (const d of docs) {
  const tag = `${d._id.padEnd(46)} ${String(d.title).padEnd(26)}`
  if (d.url) {
    console.log(`✓ ${tag} đã ở Sanity`)
    continue
  }
  if (!d.localFile) {
    console.log(`– ${tag} không có file nào`)
    continue
  }
  const file = path.join('public', d.localFile)
  if (!fs.existsSync(file)) {
    console.log(`✗ ${tag} thiếu ${file}`)
    process.exitCode = 1
    continue
  }
  const mb = (fs.statSync(file).size / 1048576).toFixed(1)
  if (!write) {
    console.log(`→ ${tag} sẽ upload ${d.localFile} (${mb}MB)`)
    continue
  }
  const asset = await client.assets.upload('file', fs.createReadStream(file), {
    filename: path.basename(file),
    contentType: 'audio/mp4',
  })
  await client
    .patch(d._id)
    .set({audio: {_type: 'file', asset: {_type: 'reference', _ref: asset._id}}})
    .unset(['localFile'])
    .commit()
  moved++
  console.log(`↑ ${tag} ${asset.url}`)
}
console.log(write ? `\nĐã chuyển ${moved} bài.` : '\nXem trước thôi — thêm --write để làm thật.')
