#!/usr/bin/env node
// Ghép hình quay từ /chill/record với file nhạc của chill-mix-audio.mjs thành video YouTube,
// và viết sẵn phần mô tả (chương theo từng bài, link về quán có ?ref=yt).
//
//   node scripts/chill-make-video.mjs --audio .chill-video/lofi.m4a --clip ~/Movies/hanoi-night.mp4
//   node scripts/chill-make-video.mjs --audio .chill-video/all.m4a --clip hanoi.mp4 --clip hue.mp4 --clip dalat.mp4 \
//     --title "Vietnam café tour · 2.5 hours" --out .chill-video/tour
//
// Tuỳ chọn:
//   --audio <file.m4a>   file nhạc; cạnh nó phải có <file>.json (danh sách bài)
//   --clip <file>        đoạn quay cảnh, lặp lại nhiều lần được. Các đoạn chạy lần lượt rồi vòng lại
//                        cho tới hết nhạc. Nên quay mỗi đoạn 15–20 phút, cùng cài đặt OBS
//   --title <chữ>        dòng đầu của mô tả (mặc định theo trạm)
//   --out <đường dẫn>    không có đuôi; ra <out>.mp4 và <out>.txt (mặc định cạnh file nhạc)
//   --reencode           mã hoá lại hình (chậm). Cần khi các đoạn quay khác độ phân giải/codec
//
// Cần ffmpeg (PATH, hoặc biến FFMPEG).

import {execFile} from 'node:child_process'
import {existsSync} from 'node:fs'
import {readFile, unlink, writeFile} from 'node:fs/promises'
import path from 'node:path'
import {promisify} from 'node:util'

const run = promisify(execFile)
const FFMPEG = process.env.FFMPEG || 'ffmpeg'
const SITE = 'https://applebin.me/chill'
const STATION_NAME = {acoustic: 'Café Acoustic', focus: 'Deep Focus', sax: 'Sax Lounge', lofi: 'Lo-fi', study: 'Study Beats'}

const args = process.argv.slice(2)
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : fallback
}
const many = (name) => args.flatMap((a, i) => (a === `--${name}` && args[i + 1] ? [args[i + 1]] : []))

function fail(msg) {
  console.error(msg)
  process.exit(1)
}

const audio = opt('audio')
if (!audio) fail('Thiếu --audio <file.m4a> (tạo bằng scripts/chill-mix-audio.mjs)')
const clips = many('clip')
if (!clips.length) fail('Thiếu --clip <đoạn quay cảnh>')
for (const f of [audio, ...clips]) if (!existsSync(f)) fail(`Không thấy file: ${f}`)
const listFile = audio.replace(/\.[^.]+$/, '.json')
if (!existsSync(listFile)) fail(`Không thấy danh sách bài ${listFile} cạnh file nhạc`)
const out = opt('out', audio.replace(/\.[^.]+$/, ''))

// Độ dài file (giây), đọc từ dòng "Duration:" của ffmpeg — khỏi cần ffprobe
async function duration(file) {
  const {stderr} = await run(FFMPEG, ['-hide_banner', '-i', file]).catch((err) => err)
  const m = /Duration: (\d+):(\d+):(\d+(?:\.\d+)?)/.exec(stderr ?? '')
  if (!m) fail(`Không đọc được độ dài của ${file}`)
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3])
}

const clock = (sec) => {
  const s = Math.floor(sec)
  const h = Math.floor(s / 3600)
  const mm = String(Math.floor((s % 3600) / 60)).padStart(h ? 2 : 1, '0')
  return h ? `${h}:${mm}:${String(s % 60).padStart(2, '0')}` : `${mm}:${String(s % 60).padStart(2, '0')}`
}

// Phần mô tả: chương phải bắt đầu từ 0:00, mỗi chương ≥ 10 giây (quy định của YouTube)
function description(info, length) {
  const stations = info.stations.map((s) => STATION_NAME[s] ?? s)
  const station = info.stations.length === 1 ? info.stations[0] : null
  const link = `${SITE}?${new URLSearchParams({ref: 'yt', ...(station ? {station} : {})})}`
  const title = opt('title', `${stations.join(' · ')} · Hanoi café window · ${clock(length)}`)
  // Mốc dài cỡ nào thì các mốc ngắn cũng viết cùng kiểu (0:00:00 khi video quá 1 giờ)
  const pad = (t) => (length >= 3600 && t.split(':').length === 2 ? `0:${t.padStart(5, '0')}` : t)
  const chapters = info.chapters.filter((c, i) => i === 0 || c.start - info.chapters[i - 1].start >= 10)
  return [
    title,
    '',
    `☕ Ngồi quán thật, đổi nhạc, bật mưa, hẹn giờ phin: ${link}`,
    `☕ Sit in the real café, pick a station, turn on rain, start a focus timer: ${link}`,
    '',
    'Tracklist',
    ...chapters.map((c) => `${pad(c.time)} ${c.title}`),
    '',
    'Music and pixel art were made with AI tools, then edited for the café. Nhạc và hình làm bằng công cụ AI rồi chỉnh lại cho quán.',
    `Terms & copyright: ${SITE}/terms`,
  ].join('\n')
}

async function main() {
  try {
    await run(FFMPEG, ['-version'])
  } catch {
    fail(`Không chạy được ${FFMPEG}. Cài ffmpeg (vd: brew install ffmpeg) hoặc đặt biến FFMPEG.`)
  }
  const info = JSON.parse(await readFile(listFile, 'utf8'))
  const length = await duration(audio)
  const lengths = await Promise.all(clips.map(duration))

  // Lặp các đoạn quay cho đủ độ dài nhạc
  const order = []
  let covered = 0
  for (let i = 0; covered < length; i++) {
    const k = i % clips.length
    order.push(clips[k])
    covered += lengths[k]
  }
  const concat = `${out}.clips.txt`
  await writeFile(concat, order.map((f) => `file '${path.resolve(f).replace(/'/g, "'\\''")}'`).join('\n'))

  const video = args.includes('--reencode')
    ? ['-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', '30']
    : ['-c:v', 'copy']
  console.log(`Ghép ${order.length} lượt cảnh (${clips.length} đoạn) với nhạc dài ${clock(length)}…`)
  try {
    await run(
      FFMPEG,
      ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', concat, '-i', audio, '-map', '0:v:0', '-map', '1:a:0', ...video, '-c:a', 'copy', '-t', String(length), '-movflags', '+faststart', `${out}.mp4`],
      {maxBuffer: 1 << 26}
    )
  } finally {
    await unlink(concat).catch(() => {})
  }
  await writeFile(`${out}.txt`, description(info, length))
  console.log(`Xong: ${out}.mp4, mô tả: ${out}.txt`)
}

main().catch((err) => fail(err.stderr || err.message || String(err)))
