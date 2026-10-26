// Chụp lại ảnh Chrome Web Store vào extension/store/:
//   node extension/store/src/render.mjs
//
// 1. Mở Chrome headless, nạp extension/dist (build trước bằng `npm --prefix extension run build`),
//    bật mưa + bấm phát, chụp popup thật ở ×2 → popup@2x.png
// 2. Chụp 4 bố cục HTML ở đúng cỡ Store yêu cầu, rồi bỏ kênh alpha (Store chỉ nhận
//    JPEG hoặc PNG 24-bit) bằng Python Pillow
//
// Cần: Google Chrome trong /Applications, python3 có Pillow.

import {execFileSync, spawn} from 'node:child_process'
import {mkdtempSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const store = join(here, '..')
const dist = join(here, '../../dist')
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const PORT = 9333

const JOBS = [
  ['shot1', 1280, 800, 'screenshot-1-1280x800.png'],
  ['shot2', 1280, 800, 'screenshot-2-1280x800.png'],
  ['small', 440, 280, 'small-promo-440x280.png'],
  ['marquee', 1400, 560, 'marquee-1400x560.png'],
]

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const profile = mkdtempSync(join(tmpdir(), 'lpc-store-'))
const chrome = spawn(CHROME, [
  '--headless=new',
  `--user-data-dir=${profile}`,
  `--remote-debugging-port=${PORT}`,
  '--enable-unsafe-extension-debugging',
  '--autoplay-policy=no-user-gesture-required',
  '--hide-scrollbars',
  'about:blank',
], {stdio: 'ignore'})

try {
  let ver
  for (let i = 0; i < 40 && !ver; i++) {
    await sleep(250)
    ver = await fetch(`http://127.0.0.1:${PORT}/json/version`).then((r) => r.json()).catch(() => null)
  }
  const ws = new WebSocket(ver.webSocketDebuggerUrl)
  let id = 0
  const pending = new Map()
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data)
    pending.get(m.id)?.(m)
    pending.delete(m.id)
  }
  await new Promise((r) => (ws.onopen = r))
  const send = (method, params = {}, sessionId) =>
    new Promise((r) => {
      const i = ++id
      pending.set(i, r)
      ws.send(JSON.stringify({id: i, method, params, sessionId}))
    })
  const open = async (url, width, height, dpr) => {
    const {result: {targetId}} = await send('Target.createTarget', {url: 'about:blank'})
    const {result: {sessionId}} = await send('Target.attachToTarget', {targetId, flatten: true})
    await send('Emulation.setDeviceMetricsOverride', {width, height, deviceScaleFactor: dpr, mobile: false}, sessionId)
    await send('Page.navigate', {url}, sessionId)
    return sessionId
  }
  const ev = async (s, expression) => (await send('Runtime.evaluate', {expression, returnByValue: true}, s)).result?.result?.value
  const shot = async (s, file, width, height) => {
    const r = await send('Page.captureScreenshot', {format: 'png', clip: {x: 0, y: 0, width, height, scale: 1}}, s)
    writeFileSync(file, Buffer.from(r.result.data, 'base64'))
  }

  // 1. Popup thật: bật mưa, phát nhạc, chờ thanh tiến trình chạy
  const {result: ext} = await send('Extensions.loadUnpacked', {path: dist})
  const p = await open(`chrome-extension://${ext.id}/popup.html`, 360, 900, 2)
  await sleep(2000)
  await ev(p, `document.getElementById('rain-btn').click(); document.getElementById('play').click()`)
  await sleep(12000)
  const h = await ev(p, `Math.ceil(document.querySelector('.popup').getBoundingClientRect().height)`)
  await shot(p, join(here, 'popup@2x.png'), 360, h)
  console.log('popup:', await ev(p, `title.textContent + ' ' + pos.textContent`))

  // 2. Bốn bố cục
  for (const [name, w, hh] of JOBS) {
    const s = await open(`file://${join(here, name + '.html')}`, w, hh, 1)
    await sleep(1500)
    await shot(s, join(here, `${name}.raw.png`), w, hh)
  }
  ws.close()
} finally {
  chrome.kill()
  await sleep(500)
  rmSync(profile, {recursive: true, force: true})
}

const py = `
import sys
from PIL import Image
src, dst = sys.argv[1], sys.argv[2]
Image.open(src).convert('RGB').save(dst)
`
for (const [name, , , out] of JOBS) {
  execFileSync('python3', ['-c', py, join(here, `${name}.raw.png`), join(store, out)])
  rmSync(join(here, `${name}.raw.png`))
  console.log('→', out)
}
