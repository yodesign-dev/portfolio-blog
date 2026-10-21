// Bộ trộn âm thanh nền trang /chill (Cài đặt › Không khí): mỗi tiếng một thanh trượt.
//
// - mix = null → "Theo cảnh": như trước khi có mixer — 1 mức âm nền (prefs.ambience), loại
//   tiếng đi theo thời tiết (mưa → tiếng mưa, quang → tiếng phố, sương → phòng yên tĩnh)
// - Kéo 1 thanh bất kỳ / bấm 1 bản trộn có sẵn → bản trộn riêng, lưu trong prefs, từ đó
//   không đổi theo thời tiết nữa. "Theo cảnh" để quay lại
//
// Mỗi kênh 0…1. Tiếng phố gồm cả tiếng ồn nền lẫn sự kiện (xe chạy qua, còi, tàu).

import type {Ambience} from './audio'

export const MIX_CHANNELS = ['rain', 'street', 'cafe', 'purr'] as const
export type MixChannel = (typeof MIX_CHANNELS)[number]
export type Mix = Record<MixChannel, number>

export const MIX_PRESETS = {
  busy: {rain: 0, street: 0.45, cafe: 0.75, purr: 0},
  rainyNight: {rain: 0.75, street: 0.15, cafe: 0.25, purr: 0.25},
  quiet: {rain: 0, street: 0.1, cafe: 0, purr: 0.35},
} satisfies Record<string, Mix>
export type MixPreset = keyof typeof MIX_PRESETS

export const SILENT: Mix = {rain: 0, street: 0, cafe: 0, purr: 0}

// Bản trộn tương đương chế độ "Theo cảnh" — để các thanh hiện đúng mức đang nghe, và kéo
// thanh đầu tiên thì bắt đầu từ đó chứ không nhảy về 0. Khớp hệ số trong audio.ts
export function sceneMix(level: number, kind: Ambience): Mix {
  if (kind === 'rain') return {rain: level, street: level * 0.25, cafe: 0, purr: 0}
  if (kind === 'quiet') return {rain: 0, street: level * 0.4, cafe: 0, purr: 0}
  return {rain: 0, street: level, cafe: 0, purr: 0}
}

const clamp = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0)

// Đọc bản trộn trong prefs (bản cũ chưa có → null = theo cảnh)
export function parseMix(v: unknown): Mix | null {
  if (!v || typeof v !== 'object') return null
  const o = v as Record<string, unknown>
  return {rain: clamp(o.rain), street: clamp(o.street), cafe: clamp(o.cafe), purr: clamp(o.purr)}
}

// Bản trộn đang dùng trùng bản có sẵn nào (để tô sáng nút)
export function presetOf(mix: Mix | null): MixPreset | 'scene' | 'custom' {
  if (!mix) return 'scene'
  for (const [id, p] of Object.entries(MIX_PRESETS) as [MixPreset, Mix][]) {
    if (MIX_CHANNELS.every((c) => Math.abs(p[c] - mix[c]) < 0.005)) return id
  }
  return 'custom'
}
