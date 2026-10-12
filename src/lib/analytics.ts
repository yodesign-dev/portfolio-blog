import {track} from '@vercel/analytics'

// Tên event tập trung 1 chỗ để dashboard Vercel không bị lệch tên
// (vd "contact open" vs "Contact Open"). Funnel chính:
//   xem /work/... → Contact Open → Contact Submit / Book Call Click
export type AnalyticsEvent =
  | {name: 'Contact Open'; props: {source: string}}
  | {name: 'Contact Submit'; props?: undefined}
  | {name: 'Book Call Click'; props?: undefined}
  | {name: 'CTA Click'; props: {cta: string}}
  | {name: 'Social Click'; props: {network: string}}
  | {name: 'Share'; props: {platform: string}}
  // Phễu /chill (trang 1 màn hình nên bounce rate của Vercel không nói lên gì):
  //   Chill Visit → Chill Start (lần bấm phát đầu tiên) → Chill Listen (mốc phút đã nghe)
  // `visitor`: new = lần đầu · same-day / within-week / later = khoảng cách từ lần ghé trước
  // · returning = khách cũ từ trước khi có mốc này
  | {name: 'Chill Visit'; props: {visitor: 'new' | 'returning' | 'same-day' | 'within-week' | 'later'}}
  | {name: 'Chill Start'; props: {from: 'welcome' | 'player'}}
  | {name: 'Chill Listen'; props: {minutes: number}}
  | {name: 'Chill Look Around'; props?: undefined}
  | {name: 'Chill Lang'; props: {lang: 'en' | 'vi'}}
  // Đồng hồ phin: bắt đầu / làm xong / dừng giữa chừng
  | {name: 'Chill Focus'; props: {action: 'start' | 'done' | 'stop'}}
  | {name: 'Chill Play'; props: {track: string}}
  | {name: 'Chill Pet Cat'; props?: undefined}
  | {name: 'Chill Donate Open'; props?: {from: string}}
  | {name: 'Chill Board Open'; props?: undefined}
  | {name: 'Chill Donate Thanks'; props: {method: string}}
  | {name: 'Chill Updates Open'; props: {from: string}}
  | {name: 'Chill Update Try'; props: {action: string}}
  | {name: 'Chill Table'; props: {action: 'create' | 'join' | 'copy' | 'leave' | 'view' | 'wall-glass' | 'wall-brick'}}
  | {name: 'Chill Zen'; props: {on: 'on' | 'off'}}
  // Bảng nhật ký: mở bảng / treo mẩu lên tường / cất mẩu vào sổ / báo cáo mẩu
  | {name: 'Chill Diary'; props: {action: 'open' | 'pin' | 'keep' | 'report'}}

export function trackEvent({name, props}: AnalyticsEvent) {
  try {
    track(name, {...props, page: window.location.pathname})
  } catch {
    // Analytics lỗi không được ảnh hưởng tới trải nghiệm người dùng
  }
}
