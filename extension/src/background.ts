// Service worker: nhận lệnh từ popup / bảng bên / phím tắt, mở offscreen document để phát nhạc.
//
// Chrome chỉ cho mỗi extension 1 offscreen document, và đóng nó khi im lặng quá 30 giây
// (lý do AUDIO_PLAYBACK). Vì vậy bài + vị trí đang phát được lưu ở chrome.storage.session:
// bấm phát lại sau khi offscreen đã đóng thì mở lại và phát tiếp đúng chỗ.
//
// Service worker cũng bị Chrome tắt khi rảnh ~30 giây → không giữ trạng thái trong biến:
// mọi thứ đọc lại từ chrome.storage và chrome.runtime.getContexts() ở mỗi lệnh. Biến duy
// nhất (`creating`) chỉ là khoá chống tạo 2 offscreen cùng lúc trong 1 lần thức, mất cũng
// không sao.

import {
  getCatalog,
  getNowPlaying,
  getPrefs,
  migrate,
  sendSafe,
  tracksOf,
  type BgCommand,
  type NowPlaying,
  type OffscreenCommand,
  type Prefs,
  type Reply,
  type StatusMessage,
} from './shared'

const OFFSCREEN_URL = 'offscreen.html'
const OK: Reply = {ok: true}

let creating: Promise<void> | null = null

async function hasOffscreen() {
  const contexts = await chrome.runtime.getContexts({
    contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
    documentUrls: [chrome.runtime.getURL(OFFSCREEN_URL)],
  })
  return contexts.length > 0
}

async function ensureOffscreen() {
  if (await hasOffscreen()) return
  creating ??= chrome.offscreen
    .createDocument({
      url: OFFSCREEN_URL,
      reasons: [chrome.offscreen.Reason.AUDIO_PLAYBACK],
      justification: 'Phát nhạc lofi khi popup đã đóng',
    })
    .finally(() => {
      creating = null
    })
  await creating
}

// true = offscreen đã nhận lệnh. false = không ai nghe (Chrome vừa đóng offscreen)
const toOffscreen = async (msg: OffscreenCommand) => (await sendSafe<{ok: true}>(msg)) !== null

const saveNow = (now: NowPlaying) => chrome.storage.session.set({now})

// Bắt đầu phát 1 trạm: tiếp bài cũ nếu cùng trạm (kể cả vị trí), không thì bài đầu
async function start(prefs: Prefs, fromStart = false): Promise<Reply> {
  let catalog
  try {
    catalog = await getCatalog()
  } catch {
    return {ok: false, reason: 'offline'}
  }
  let tracks = tracksOf(catalog, prefs.station)
  if (!tracks.length) {
    // Trạm đã lưu không còn bài (trạm theo mùa đã đóng, bài bị ẩn trong Studio) → trạm đầu
    // tiên còn bài; ghi lại để popup đổi theo (popup nghe chrome.storage.onChanged)
    const open = catalog.stations.find((s) => tracksOf(catalog, s.id).length > 0)
    if (!open) return {ok: false, reason: 'empty'}
    prefs = {...prefs, station: open.id}
    await chrome.storage.local.set({prefs})
    tracks = tracksOf(catalog, open.id)
    fromStart = true
  }
  const now = fromStart ? null : await getNowPlaying()
  const resume = now && now.station === prefs.station && tracks.some((t) => t.id === now.trackId) ? now : null
  const play: OffscreenCommand = {
    target: 'offscreen',
    type: 'play',
    tracks,
    station: prefs.station,
    trackId: resume?.trackId,
    at: resume?.position,
    prefs,
  }
  await ensureOffscreen()
  if (await toOffscreen(play)) return OK
  // Offscreen bị đóng đúng lúc vừa kiểm tra xong → mở lại, thử thêm đúng 1 lần
  await ensureOffscreen()
  return (await toOffscreen(play)) ? OK : {ok: false, reason: 'error'}
}

async function handle(cmd: BgCommand): Promise<Reply> {
  const alive = await hasOffscreen()
  let now = await getNowPlaying()
  // Chrome đã đóng offscreen mà chưa kịp báo "đã dừng" (mất mạng giữa bài, máy ngủ):
  // sửa lại để nút phát của popup không hiện sai là đang phát
  if (!alive && now?.playing) {
    now = {...now, playing: false}
    await saveNow(now)
  }
  switch (cmd.type) {
    case 'sync':
      return OK
    case 'toggle':
      if (alive && now?.playing && (await toOffscreen({target: 'offscreen', type: 'pause'}))) return OK
      if (alive && now && !now.playing && (await toOffscreen({target: 'offscreen', type: 'resume'}))) return OK
      return start(await getPrefs())
    case 'next':
    case 'prev':
      if (alive && (await toOffscreen({target: 'offscreen', type: cmd.type}))) return OK
      return start(await getPrefs())
    case 'station': {
      const prefs = {...(await getPrefs()), station: cmd.station}
      await chrome.storage.local.set({prefs})
      return start(prefs, true)
    }
    case 'prefs': {
      const prefs = {...(await getPrefs()), ...cmd.prefs}
      await chrome.storage.local.set({prefs})
      if (alive) await toOffscreen({target: 'offscreen', type: 'prefs', prefs})
      return OK
    }
  }
}

chrome.runtime.onMessage.addListener((msg: BgCommand | StatusMessage, _sender, reply) => {
  if (msg.target === 'status') {
    void saveNow(msg.now).catch(() => {})
    return
  }
  if (msg.target !== 'background') return
  handle(msg)
    .catch((error): Reply => {
      console.warn('Lofi Pixel Cafe:', error)
      return {ok: false, reason: 'error'}
    })
    // Popup có thể đã đóng trước khi có kết quả — trả lời vào kênh đã đóng thì bỏ qua
    .then((res) => {
      try {
        reply(res)
      } catch {}
    })
  return true
})

const COMMANDS: Record<string, BgCommand['type']> = {'toggle-play': 'toggle', 'next-track': 'next'}

chrome.commands.onCommand.addListener((command) => {
  const type = COMMANDS[command]
  if (type === 'toggle' || type === 'next') void handle({target: 'background', type}).catch((error) => console.warn('Lofi Pixel Cafe:', error))
})

// Cài lần đầu / cập nhật: chuyển dữ liệu bản cũ sang cấu trúc mới (xem migrate() trong
// shared.ts), rồi tải sẵn danh sách nhạc để lần bấm đầu phát ngay
chrome.runtime.onInstalled.addListener(({reason}) => {
  if (reason !== 'install' && reason !== 'update') return
  void migrate()
    .catch((error) => console.warn('Lofi Pixel Cafe: migrate', error))
    .then(() => getCatalog(true))
    .catch(() => {})
})
