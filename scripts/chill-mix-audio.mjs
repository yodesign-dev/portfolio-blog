#!/usr/bin/env node
// Ghép nhạc của /chill thành 1 file dài cho video YouTube: lấy bài trong Sanity theo trạm,
// chồng mờ giữa các bài, chuẩn âm lượng −14 LUFS (mức YouTube), xuất .m4a + danh sách bài.
//
//   node scripts/chill-mix-audio.mjs --station lofi
//   node scripts/chill-mix-audio.mjs --station all --shuffle --seed 7 --out .chill-video/tour
//   node scripts/chill-mix-audio.mjs --station study,focus --minutes 100 --repeat
//
// Tuỳ chọn:
//   --station <id[,id]|all>  acoustic, focus, sax, lofi, study (mặc định lofi)
//   --minutes <n>            dừng khi đủ n phút. Thiếu bài thì báo lỗi, trừ khi có --repeat
//   --repeat                 cho phép lặp lại bài khi thiếu (không lặp 2 bài liền nhau)
//   --shuffle [--seed <n>]   trộn thứ tự (cùng seed = cùng thứ tự); mặc định theo thứ tự Studio
//   --fade <giây>            độ dài chồng mờ giữa 2 bài (mặc định 4)
//   --out <đường dẫn>        không có đuôi; ra <out>.m4a và <out>.json (mặc định .chill-video/<trạm>)
//
// Cần ffmpeg (đặt trong PATH, hoặc chỉ đường bằng biến FFMPEG).
// File nhạc tải về được giữ trong .chill-video/cache để lần sau khỏi tải lại.

import {execFile} from 'node:child_process'
import {existsSync} from 'node:fs'
import {mkdir, writeFile} from 'node:fs/promises'
import path from 'node:path'
import {promisify} from 'node:util'

const run = promisify(execFile)
const FFMPEG = process.env.FFMPEG || 'ffmpeg'
const PROJECT = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || '9os2xcca'
const DATASET = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'
const STATIONS = ['acoustic', 'focus', 'sax', 'lofi', 'study']
const ROOT = '.chill-video'

// --- tham số ---
const args = process.argv.slice(2)
const flag = (name) => args.includes(`--${name}`)
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : fallback
}
const stationArg = opt('station', 'lofi')
const wanted = stationArg === 'all' ? STATIONS : stationArg.split(',').map((s) => s.trim())
const bad = wanted.filter((s) => !STATIONS.includes(s))
if (bad.length) fail(`Trạm không có: ${bad.join(', ')}. Chọn trong: ${STATIONS.join(', ')}, all`)
const minutes = opt('minutes') ? Number(opt('minutes')) : null
if (minutes !== null && !(minutes > 0)) fail('--minutes phải là số phút > 0')
const fade = Math.max(0, Number(opt('fade', '4')) || 0)
const out = opt('out', path.join(ROOT, stationArg === 'all' ? 'all' : wanted.join('-')))

function fail(msg) {
  console.error(msg)
  process.exit(1)
}

// Trộn có seed để lần sau ra lại đúng thứ tự cũ
function shuffled(list, seed) {
  let s = seed >>> 0 || 1
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32)
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const clock = (sec) => {
  const s = Math.floor(sec)
  const h = Math.floor(s / 3600)
  const mm = String(Math.floor((s % 3600) / 60)).padStart(h ? 2 : 1, '0')
  const ss = String(s % 60).padStart(2, '0')
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

// Độ dài file (giây), đọc từ dòng "Duration:" của ffmpeg — khỏi cần ffprobe
async function duration(file) {
  const {stderr} = await run(FFMPEG, ['-hide_banner', '-i', file]).catch((err) => err)
  const m = /Duration: (\d+):(\d+):(\d+(?:\.\d+)?)/.exec(stderr ?? '')
  if (!m) fail(`Không đọc được độ dài của ${file}`)
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3])
}

async function checkTools() {
  try {
    await run(FFMPEG, ['-version'])
  } catch {
    fail(`Không chạy được ${FFMPEG}. Cài ffmpeg (vd: brew install ffmpeg) hoặc đặt biến FFMPEG.`)
  }
}

// Cùng điều kiện với src/app/chill/content.ts: bài không ẩn, đã có file
async function loadTracks() {
  const query = `*[_type == "chillTrack" && hidden != true && (defined(audio.asset) || defined(localFile))]
    | order(coalesce(order, 9999) asc, _createdAt asc) {
      "id": coalesce(key.current, _id), title, mood, "station": coalesce(station, "lofi"),
      "src": coalesce(audio.asset->url, localFile)
    }`
  const url = `https://${PROJECT}.apicdn.sanity.io/v2023-01-01/data/query/${DATASET}?query=${encodeURIComponent(query)}`
  const res = await fetch(url)
  if (!res.ok) fail(`Sanity trả lỗi ${res.status}`)
  const {result} = await res.json()
  // Bài trên máy (localFile, /chill/...) không tải được từ CDN → bỏ qua
  return result.filter((t) => t.src?.startsWith('https://'))
}

async function download(track) {
  const file = path.join(ROOT, 'cache', path.basename(new URL(track.src).pathname))
  if (!existsSync(file)) {
    const res = await fetch(track.src)
    if (!res.ok) fail(`Không tải được "${track.title}" (${res.status})`)
    await writeFile(file, Buffer.from(await res.arrayBuffer()))
  }
  return {...track, file, duration: await duration(file)}
}

// Chọn bài cho đủ thời lượng. Có --repeat thì vòng lại, tránh 2 bài giống nhau liền nhau
function pick(pool) {
  if (minutes === null) return pool
  const need = minutes * 60
  const list = []
  let total = 0
  let i = 0
  while (total - Math.max(0, list.length - 1) * fade < need) {
    if (i >= pool.length && !flag('repeat')) {
      fail(`Chỉ có ${Math.round(total / 60)} phút nhạc cho trạm ${stationArg}, cần ${minutes} phút. Thêm --repeat để lặp bài, hoặc giảm --minutes.`)
    }
    let next = pool[i % pool.length]
    if (list.length && list[list.length - 1].id === next.id && pool.length > 1) next = pool[++i % pool.length]
    list.push(next)
    total += next.duration
    i++
  }
  return list
}

async function main() {
  await checkTools()
  await mkdir(path.join(ROOT, 'cache'), {recursive: true})
  await mkdir(path.dirname(out), {recursive: true})

  const all = (await loadTracks()).filter((t) => wanted.includes(t.station))
  // Giữ thứ tự trạm như trên trang (acoustic → focus → sax → lofi → study)
  all.sort((a, b) => STATIONS.indexOf(a.station) - STATIONS.indexOf(b.station))
  if (!all.length) fail(`Không có bài nào cho trạm ${stationArg}`)
  const ordered = flag('shuffle') ? shuffled(all, Number(opt('seed', '1'))) : all

  console.log(`Tải ${ordered.length} bài…`)
  const pool = []
  for (const t of ordered) pool.push(await download(t))
  const list = pick(pool)

  // Mốc bắt đầu từng bài (tính cả phần chồng mờ) → chương trên YouTube
  let at = 0
  const chapters = list.map((t, i) => {
    const start = at
    at += t.duration - (i < list.length - 1 ? fade : 0)
    return {start: Math.round(start), time: clock(start), title: t.title, mood: t.mood, station: t.station, id: t.id}
  })
  const length = at

  // Nối các bài bằng acrossfade, rồi chuẩn âm lượng
  const inputs = list.flatMap((t) => ['-i', t.file])
  // Bài nào cũng đưa về stereo 48 kHz trước, vì acrossfade cần 2 đầu vào cùng kiểu
  let graph = list.map((_, i) => `[${i}:a]aformat=sample_rates=48000:channel_layouts=stereo[a${i}];`).join('')
  if (list.length === 1 || fade === 0) {
    graph += `${list.map((_, i) => `[a${i}]`).join('')}concat=n=${list.length}:v=0:a=1[mix];`
  } else {
    let prev = '[a0]'
    for (let i = 1; i < list.length; i++) {
      const label = i === list.length - 1 ? '[mix]' : `[x${i}]`
      graph += `${prev}[a${i}]acrossfade=d=${fade}:c1=tri:c2=tri${label};`
      prev = label
    }
  }
  graph += '[mix]loudnorm=I=-14:TP=-1.5:LRA=11,aformat=sample_rates=48000:channel_layouts=stereo[out]'

  console.log(`Ghép ${list.length} bài, dài ${clock(length)}…`)
  await run(
    FFMPEG,
    ['-y', '-v', 'error', ...inputs, '-filter_complex', graph, '-map', '[out]', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', `${out}.m4a`],
    {maxBuffer: 1 << 26}
  )
  await writeFile(`${out}.json`, JSON.stringify({stations: wanted, fade, length: Math.round(length), chapters}, null, 2))

  console.log(`Xong: ${out}.m4a (${clock(length)}), danh sách bài: ${out}.json`)
  const repeats = list.length - new Set(list.map((t) => t.id)).size
  if (repeats) console.log(`Lưu ý: có ${repeats} lượt lặp bài.`)
}

main().catch((err) => fail(err.stderr || err.message || String(err)))
