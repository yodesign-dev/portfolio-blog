// Popup: chỉ vẽ trạng thái và gửi lệnh cho background — nhạc nằm ở offscreen document,
// nên đóng popup nhạc vẫn phát. Trạng thái bài đang phát đến qua tin nhắn 'status'.

import {BASE, getCatalog, getNowPlaying, getPrefs, type BgCommand, type NowPlaying, type Prefs, type Station, type StatusMessage} from './shared'

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T

const els = {
  open: $<HTMLAnchorElement>('open'),
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

const send = (cmd: BgCommand) => chrome.runtime.sendMessage(cmd)

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

async function init() {
  els.open.href = `${BASE}/chill`
  els.chip.textContent = `Quán · ${partOfDay()}`

  prefs = await getPrefs()
  now = await getNowPlaying()
  renderMix()

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

chrome.runtime.onMessage.addListener((msg: StatusMessage) => {
  if (msg.target !== 'status') return
  now = msg.now
  if (prefs) renderNow()
})

void init()
