// Popup: chỉ vẽ trạng thái và gửi lệnh cho background — nhạc nằm ở offscreen document,
// nên đóng popup nhạc vẫn phát. Trạng thái bài đang phát đến qua tin nhắn 'status'.

import {BASE, getCatalog, getNowPlaying, getPrefs, sendSafe, type BgCommand, type NowPlaying, type Prefs, type Station, type StatusMessage} from './shared'

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T

const els = {
  open: $<HTMLAnchorElement>('open'),
  pin: $<HTMLButtonElement>('pin'),
  scene: $('scene'),
  chip: $('chip'),
  rainBtn: $<HTMLButtonElement>('rain-btn'),
  title: $('title'),
  stationLabel: $('station-label'),
  bar: $('bar'),
  pos: $('pos'),
  dur: $('dur'),
  prev: $<HTMLButtonElement>('prev'),
  play: $<HTMLButtonElement>('play'),
  next: $<HTMLButtonElement>('next'),
  stations: $('stations'),
  music: $<HTMLInputElement>('v-music'),
  rain: $<HTMLInputElement>('v-rain'),
  cafe: $<HTMLInputElement>('v-cafe'),
  foot: document.querySelector('.foot') as HTMLElement,
  note: $('note'),
  shortcut: $('shortcut'),
}

// Mức mưa khi bấm nút mưa trên cảnh (thanh trượt vẫn chỉnh tự do)
const RAIN_ON = 0.45

let prefs: Prefs
let stations: Station[] = []
let now: NowPlaying | null = null

const NOTE = 'Đóng ô này nhạc vẫn phát'
const ERRORS = {
  offline: `Không kết nối được quán (${new URL(BASE).host}) — thử lại sau`,
  empty: 'Quán chưa có bài nào để phát',
  error: 'Có lỗi khi phát nhạc — bấm lại thử nhé',
}

// null = service worker không trả lời (extension vừa cập nhật, trang này đã cũ)
const send = async (cmd: BgCommand) => {
  const res = await sendSafe(cmd)
  if (!res) showError('Mất kết nối với extension — đóng ô này rồi mở lại')
  else if (!res.ok) showError(ERRORS[res.reason])
  else clearError()
}

const clock = (s: number) => {
  const t = Math.max(0, Math.floor(s || 0))
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`
}

// Buổi theo giờ máy của khách — cùng mốc với timeOfDay() của /chill/embed
function partOfDay() {
  const h = new Date().getHours()
  if (h >= 5 && h < 11) return 'Sáng'
  if (h >= 11 && h < 18) return 'Chiều'
  return 'Tối'
}

function renderStations() {
  els.stations.replaceChildren(
    ...stations.map((s) => {
      const b = document.createElement('button')
      b.type = 'button'
      b.textContent = s.short
      b.setAttribute('aria-pressed', String(s.id === prefs.station))
      b.addEventListener('click', () => {
        prefs = {...prefs, station: s.id}
        renderStations()
        renderNow()
        void send({target: 'background', type: 'station', station: s.id})
      })
      return b
    }),
  )
}

function renderNow() {
  const label = stations.find((s) => s.id === prefs.station)?.label ?? ''
  const same = now && now.station === prefs.station
  els.stationLabel.textContent = label
  els.title.textContent = same ? now!.title : 'Bấm phát để nghe'
  const playing = !!(same && now!.playing)
  els.play.classList.toggle('playing', playing)
  els.play.setAttribute('aria-label', playing ? 'Dừng' : 'Phát')
  const pos = same ? now!.position : 0
  const dur = same ? now!.duration : 0
  els.pos.textContent = clock(pos)
  els.dur.textContent = clock(dur)
  els.bar.style.width = dur > 0 ? `${Math.min(100, (pos / dur) * 100)}%` : '0'
}

function renderMix() {
  els.music.value = String(Math.round(prefs.volume * 100))
  els.rain.value = String(Math.round(prefs.rain * 100))
  els.cafe.value = String(Math.round(prefs.cafe * 100))
  const raining = prefs.rain > 0
  els.scene.classList.toggle('raining', raining)
  els.rainBtn.setAttribute('aria-pressed', String(raining))
  els.rainBtn.setAttribute('aria-label', raining ? 'Tắt mưa' : 'Bật mưa')
}

function setPrefs(patch: Partial<Prefs>) {
  prefs = {...prefs, ...patch}
  renderMix()
  void send({target: 'background', type: 'prefs', prefs: patch})
}

function showError(text: string) {
  els.foot.classList.add('error')
  els.note.textContent = text
}

function clearError() {
  if (!els.foot.classList.contains('error')) return
  els.foot.classList.remove('error')
  els.note.textContent = NOTE
}

async function init() {
  els.open.href = `${BASE}/chill`
  els.chip.textContent = `Quán · ${partOfDay()}`

  prefs = await getPrefs()
  // Nhờ background soát lại "đang phát" trước khi đọc (offscreen có thể đã bị Chrome đóng)
  await sendSafe({target: 'background', type: 'sync'})
  now = await getNowPlaying()
  renderMix()

  // Ghim sang bảng bên: chỉ trong popup, và chỉ khi trình duyệt có chrome.sidePanel
  if (!document.body.classList.contains('panel') && 'sidePanel' in chrome) els.pin.hidden = false

  const [command] = await chrome.commands.getAll().then((all) => all.filter((c) => c.name === 'toggle-play'))
  if (command?.shortcut) {
    els.shortcut.textContent = command.shortcut
    els.shortcut.hidden = false
  }

  try {
    stations = (await getCatalog()).stations
  } catch {
    showError('Chưa tải được danh sách nhạc — kiểm tra mạng')
  }
  renderStations()
  renderNow()
}

els.play.addEventListener('click', () => void send({target: 'background', type: 'toggle'}))
els.next.addEventListener('click', () => void send({target: 'background', type: 'next'}))
els.prev.addEventListener('click', () => void send({target: 'background', type: 'prev'}))
els.rainBtn.addEventListener('click', () => setPrefs({rain: prefs.rain > 0 ? 0 : RAIN_ON}))
els.music.addEventListener('input', () => setPrefs({volume: Number(els.music.value) / 100}))
els.rain.addEventListener('input', () => setPrefs({rain: Number(els.rain.value) / 100}))
els.cafe.addEventListener('input', () => setPrefs({cafe: Number(els.cafe.value) / 100}))

els.pin.addEventListener('click', async () => {
  try {
    // Phải gọi ngay trong lần bấm (Chrome đòi thao tác của người dùng), rồi mới đóng popup
    const win = await chrome.windows.getCurrent()
    await chrome.sidePanel.open({windowId: win.id!})
    window.close()
  } catch {
    showError('Chrome này chưa mở được bảng bên')
  }
})

chrome.runtime.onMessage.addListener((msg: StatusMessage) => {
  if (msg.target !== 'status') return
  now = msg.now
  if (prefs) renderNow()
})

// Popup và bảng bên có thể mở cùng lúc, và background có thể tự đổi trạm (trạm đã lưu
// không còn bài) → đổi ở đâu thì chỗ còn lại vẽ lại theo
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local' || !changes.prefs || !prefs) return
  prefs = {...prefs, ...(changes.prefs.newValue as Partial<Prefs>)}
  renderMix()
  renderStations()
  renderNow()
})

void init()
