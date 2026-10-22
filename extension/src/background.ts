// Service worker: nhận lệnh từ popup và phím tắt, mở offscreen document để phát nhạc.
//
// Chrome chỉ cho mỗi extension 1 offscreen document, và đóng nó khi im lặng quá 30 giây
// (lý do AUDIO_PLAYBACK). Vì vậy bài + vị trí đang phát được lưu ở chrome.storage.session:
// bấm phát lại sau khi offscreen đã đóng thì mở lại và phát tiếp đúng chỗ.

import {getCatalog, getNowPlaying, getPrefs, tracksOf, type BgCommand, type OffscreenCommand, type Prefs, type StatusMessage} from './shared'

const OFFSCREEN_URL = 'offscreen.html'

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

const send = (msg: OffscreenCommand) => chrome.runtime.sendMessage(msg)

// Bắt đầu phát 1 trạm: tiếp bài cũ nếu cùng trạm (kể cả vị trí), không thì bài đầu
async function start(prefs: Prefs, fromStart = false) {
  const catalog = await getCatalog()
  const tracks = tracksOf(catalog, prefs.station)
  if (!tracks.length) return
  const now = fromStart ? null : await getNowPlaying()
  const resume = now && now.station === prefs.station && tracks.some((t) => t.id === now.trackId) ? now : null
  await ensureOffscreen()
  await send({
    target: 'offscreen',
    type: 'play',
    tracks,
    station: prefs.station,
    trackId: resume?.trackId,
    at: resume?.position,
    prefs,
  })
}

async function handle(cmd: BgCommand) {
  const alive = await hasOffscreen()
  const now = await getNowPlaying()
  switch (cmd.type) {
    case 'toggle':
      if (alive && now?.playing) return send({target: 'offscreen', type: 'pause'})
      if (alive && now) return send({target: 'offscreen', type: 'resume'})
      return start(await getPrefs())
    case 'next':
    case 'prev':
      if (alive) return send({target: 'offscreen', type: cmd.type})
      return start(await getPrefs())
    case 'station': {
      const prefs = {...(await getPrefs()), station: cmd.station}
      await chrome.storage.local.set({prefs})
      return start(prefs, true)
    }
    case 'prefs': {
      const prefs = {...(await getPrefs()), ...cmd.prefs}
      await chrome.storage.local.set({prefs})
      if (alive) return send({target: 'offscreen', type: 'prefs', prefs})
    }
  }
}

chrome.runtime.onMessage.addListener((msg: BgCommand | StatusMessage, _sender, reply) => {
  if (msg.target === 'status') {
    void chrome.storage.session.set({now: msg.now})
    return
  }
  if (msg.target !== 'background') return
  // Lỗi (mất mạng, server không chạy) → báo về popup để hiện cho khách, không chỉ ghi log
  handle(msg).then(
    () => reply({ok: true}),
    (error) => {
      console.warn('Lofi Pixel Cafe:', error)
      reply({ok: false})
    },
  )
  return true
})

chrome.commands.onCommand.addListener((command) => {
  if (command === 'toggle-play') void handle({target: 'background', type: 'toggle'})
})

// Cài lần đầu / cập nhật: tải sẵn danh sách nhạc để lần bấm đầu phát ngay
chrome.runtime.onInstalled.addListener(() => {
  void getCatalog(true).catch(() => {})
})
