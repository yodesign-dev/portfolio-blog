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
  | {name: 'Chill Play'; props: {track: string}}
  | {name: 'Chill Pet Cat'; props?: undefined}

export function trackEvent({name, props}: AnalyticsEvent) {
  try {
    track(name, {...props, page: window.location.pathname})
  } catch {
    // Analytics lỗi không được ảnh hưởng tới trải nghiệm người dùng
  }
}
