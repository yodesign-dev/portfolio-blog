// Dùng chung cho cả 3 phần của extension:
// - background.js (service worker): nhận lệnh từ popup / phím tắt, mở offscreen document
// - offscreen.html: trang ẩn giữ bộ phát nhạc của /chill (audio.ts) — đóng popup vẫn phát
// - popup.html: ô bấm từ biểu tượng trên thanh công cụ
//
// Offscreen document chỉ dùng được chrome.runtime (không có chrome.storage), nên mọi thứ
// cần lưu đều do background / popup ghi.

import {stationOf, type StationId, type Track} from '../../src/components/chill/tracks'

export type {StationId, Track}

// Địa chỉ trang /chill — build bằng CHILL_BASE=http://localhost:3000 để thử với máy dev
declare const __BASE__: string
export const BASE = __BASE__

export type Station = {id: StationId; label: string; short: string}
export type Destination = {id: string; name: string; region?: string; timeZone: string; streets: Record<'morning' | 'afternoon' | 'night', string>}
export type Catalog = {v: number; stations: Station[]; tracks: Track[]; destinations: Destination[]}

// Lựa chọn của khách, lưu trong chrome.storage.local
export type Prefs = {station: StationId; volume: number; rain: number; cafe: number}
export const DEFAULT_PREFS: Prefs = {station: 'lofi', volume: 0.7, rain: 0, cafe: 0.25}

// Bài đang phát — offscreen báo lên, background lưu vào chrome.storage.session để popup mở ra
// là thấy ngay, và để phát tiếp đúng chỗ khi Chrome đã đóng offscreen (dừng lâu quá 30 giây)
export type NowPlaying = {station: StationId; trackId: string; title: string; position: number; duration: number; playing: boolean}

// Popup / phím tắt → background
export type BgCommand =
  | {target: 'background'; type: 'toggle'}
  | {target: 'background'; type: 'next' | 'prev'}
  | {target: 'background'; type: 'station'; station: StationId}
  | {target: 'background'; type: 'prefs'; prefs: Partial<Prefs>}

// Background → offscreen
export type OffscreenCommand =
  | {target: 'offscreen'; type: 'play'; tracks: Track[]; station: StationId; trackId?: string; at?: number; prefs: Prefs}
  | {target: 'offscreen'; type: 'pause' | 'resume' | 'next' | 'prev'}
  | {target: 'offscreen'; type: 'prefs'; prefs: Prefs}

// Offscreen → mọi trang của extension (background lưu lại, popup vẽ lại)
export type StatusMessage = {target: 'status'; now: NowPlaying}

export async function getPrefs(): Promise<Prefs> {
  const {prefs} = await chrome.storage.local.get('prefs')
  return {...DEFAULT_PREFS, ...(prefs as Partial<Prefs> | undefined)}
}

export async function getNowPlaying(): Promise<NowPlaying | null> {
  const {now} = await chrome.storage.session.get('now')
  return (now as NowPlaying | undefined) ?? null
}

// Danh sách nhạc lấy từ /api/chill-catalog, giữ 6 giờ trong chrome.storage.local.
// Mất mạng → dùng bản cũ; chưa có bản nào → lỗi để popup báo
const CATALOG_TTL = 6 * 60 * 60 * 1000

const abs = (url: string) => new URL(url, BASE).href

export async function getCatalog(fresh = false): Promise<Catalog> {
  const {catalog} = (await chrome.storage.local.get('catalog')) as {catalog?: {at: number; data: Catalog}}
  if (catalog && !fresh && Date.now() - catalog.at < CATALOG_TTL) return catalog.data
  try {
    const res = await fetch(`${BASE}/api/chill-catalog`)
    if (!res.ok) throw new Error(String(res.status))
    const raw = (await res.json()) as Catalog
    const data: Catalog = {
      ...raw,
      tracks: raw.tracks.map((t) => (t.src ? {...t, src: abs(t.src)} : t)),
      destinations: raw.destinations.map((d) => ({
        ...d,
        streets: {morning: abs(d.streets.morning), afternoon: abs(d.streets.afternoon), night: abs(d.streets.night)},
      })),
    }
    await chrome.storage.local.set({catalog: {at: Date.now(), data}})
    return data
  } catch (error) {
    if (catalog) return catalog.data
    throw error
  }
}

export const tracksOf = (catalog: Catalog, station: StationId) => catalog.tracks.filter((t) => stationOf(t) === station)
