// Đóng gói extension vào extension/dist (nạp thư mục này ở chrome://extensions → "Load unpacked").
//
//   node extension/build.mjs                  → trỏ về https://applebin.me
//   CHILL_BASE=http://localhost:3000 node extension/build.mjs   → thử với máy dev
//   node extension/build.mjs --watch          → tự build lại khi sửa code
//   node extension/build.mjs --zip            → thêm extension/lofi-pixel-cafe-<version>.zip để nộp Web Store
//
// Mọi code đều đóng gói sẵn (Manifest V3 không cho chạy code tải từ ngoài). Nhạc và ảnh
// phố vẫn lấy từ applebin.me / Sanity CDN; chỉ tiếng quán và ảnh quán đi kèm gói.

import {execFileSync} from 'node:child_process'
import {cpSync, mkdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'
import * as esbuild from 'esbuild'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
const out = join(here, 'dist')
const base = (process.env.CHILL_BASE ?? 'https://applebin.me').replace(/\/$/, '')
const watch = process.argv.includes('--watch')
const zip = process.argv.includes('--zip')

rmSync(out, {recursive: true, force: true})
mkdirSync(out, {recursive: true})

// File tĩnh: trang, icon, font, cùng 2 file lấy thẳng từ public/ của /chill
function copyStatic() {
  const manifest = JSON.parse(readFileSync(join(here, 'manifest.json'), 'utf8'))
  // Bản dev ghi rõ trên tên để khỏi nhầm với bản thật khi nạp cả hai
  if (base !== 'https://applebin.me') manifest.name += ' (dev)'
  // Bản nạp tay giữ ID cố định gmlihaobppdemmbnidhmkpckpfocnibj (khoá công khai trong
  // dev-key.txt) — ID này đã khai ở CORS của Sanity, không có thì Sanity CDN chặn file nhạc.
  // Gói nộp Web Store bỏ "key": Store tự cấp ID riêng, ID đó cũng phải thêm vào CORS
  if (!zip) manifest.key = readFileSync(join(here, 'dev-key.txt'), 'utf8').trim()
  writeFileSync(join(out, 'manifest.json'), JSON.stringify(manifest, null, 2))
  for (const f of ['popup.html', 'popup.css', 'offscreen.html']) cpSync(join(here, f), join(out, f))
  cpSync(join(here, 'public'), out, {recursive: true})
  cpSync(join(root, 'public/chill/scenes/room-cafe-thumb.webp'), join(out, 'scene.webp'))
  mkdirSync(join(out, 'chill/sfx'), {recursive: true})
  cpSync(join(root, 'public/chill/sfx/cafe-room.mp3'), join(out, 'chill/sfx/cafe-room.mp3'))
  return manifest.version
}

const options = {
  entryPoints: ['background', 'offscreen', 'popup'].map((n) => join(here, 'src', `${n}.ts`)),
  outdir: out,
  bundle: true,
  format: 'iife',
  target: 'chrome120',
  minify: !watch,
  sourcemap: watch ? 'inline' : false,
  define: {__BASE__: JSON.stringify(base)},
  logLevel: 'info',
}

const version = copyStatic()
if (watch) {
  const ctx = await esbuild.context(options)
  await ctx.watch()
  console.log(`Đang theo dõi thay đổi · ${base}`)
} else {
  await esbuild.build(options)
  console.log(`Xong: extension/dist · ${base}`)
  if (zip) {
    const file = join(here, `lofi-pixel-cafe-${version}.zip`)
    rmSync(file, {force: true})
    execFileSync('zip', ['-qr', file, '.'], {cwd: out})
    console.log(`Gói nộp Web Store: ${file}`)
  }
}
