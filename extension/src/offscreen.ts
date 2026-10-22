// Trang ẩn giữ bộ phát nhạc — dùng nguyên ChillAudio của /chill (audio.ts): chồng mờ giữa
// 2 bài, tiếng mưa tổng hợp, vòng lặp tiếng quán (file cafe-room.mp3 đóng gói kèm).
// Chỉ dùng được chrome.runtime → báo trạng thái lên bằng tin nhắn 'status'.

import {ChillAudio} from '../../src/components/chill/audio'
import type {NowPlaying, OffscreenCommand, Prefs, StationId, StatusMessage, Track} from './shared'

const audio = new ChillAudio()
let tracks: Track[] = []
let index = 0
let station: StationId = 'lofi'
let ticker: ReturnType<typeof setInterval> | null = null

function applyPrefs(prefs: Prefs) {
  audio.setVolume(prefs.volume)
  audio.setMix({rain: prefs.rain, street: 0, cafe: prefs.cafe, purr: 0}, true)
}

function report() {
  const track = tracks[index]
  if (!track) return
  const now: NowPlaying = {
    station,
    trackId: track.id,
    title: track.title,
    position: audio.position(),
    duration: audio.duration(),
    playing: audio.isPlaying,
  }
  void chrome.runtime.sendMessage({target: 'status', now} satisfies StatusMessage).catch(() => {})
  updateMediaSession(track)
}

// Báo vị trí mỗi giây khi đang phát (thanh tiến trình của popup)
function setTicking(on: boolean) {
  if (on && !ticker) ticker = setInterval(report, 1000)
  if (!on && ticker) {
    clearInterval(ticker)
    ticker = null
  }
}

function playAt(i: number, crossfade = false, at = 0) {
  if (!tracks.length) return
  index = (i + tracks.length) % tracks.length
  audio.play(tracks[index], crossfade)
  if (at > 0) audio.seek(at)
  setTicking(true)
  report()
}

audio.onNearEnd = () => playAt(index + 1, true)
// Dự phòng khi trình duyệt không báo kịp onNearEnd
audio.onEnded = () => playAt(index + 1)

function pause() {
  audio.pause()
  setTicking(false)
  report()
}

function resume() {
  audio.resume()
  setTicking(true)
  report()
}

// Phím media của máy (nếu Chrome chuyển tới trang ẩn) — chưa chắc chạy, không hại gì
function updateMediaSession(track: Track) {
  if (!('mediaSession' in navigator)) return
  navigator.mediaSession.metadata = new MediaMetadata({title: track.title, artist: 'Lofi Pixel Cafe'})
  navigator.mediaSession.playbackState = audio.isPlaying ? 'playing' : 'paused'
}
if ('mediaSession' in navigator) {
  navigator.mediaSession.setActionHandler('play', resume)
  navigator.mediaSession.setActionHandler('pause', pause)
  navigator.mediaSession.setActionHandler('nexttrack', () => playAt(index + 1, true))
  navigator.mediaSession.setActionHandler('previoustrack', () => playAt(index - 1))
}

chrome.runtime.onMessage.addListener((msg: OffscreenCommand, _sender, reply) => {
  if (msg.target !== 'offscreen') return
  switch (msg.type) {
    case 'play': {
      tracks = msg.tracks
      station = msg.station
      applyPrefs(msg.prefs)
      const i = msg.trackId ? tracks.findIndex((t) => t.id === msg.trackId) : 0
      playAt(Math.max(0, i), false, msg.at ?? 0)
      break
    }
    case 'pause':
      pause()
      break
    case 'resume':
      resume()
      break
    case 'next':
      playAt(index + 1, audio.isPlaying)
      break
    case 'prev':
      // Đã nghe quá 5 giây → về đầu bài, như nút "bài trước" quen thuộc
      if (audio.position() > 5) audio.seek(0)
      else playAt(index - 1)
      report()
      break
    case 'prefs':
      applyPrefs(msg.prefs)
      break
  }
  reply({ok: true})
})
