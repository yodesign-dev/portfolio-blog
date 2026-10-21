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
  // `ref` = khách tới từ đâu: ?ref= trên link (vd yt, ext), không có thì utm_source, không có nữa thì "none"
  | {name: 'Chill Visit'; props: {visitor: 'new' | 'returning' | 'same-day' | 'within-week' | 'later'; ref: string}}
  | {name: 'Chill Start'; props: {from: 'welcome' | 'player'}}
  | {name: 'Chill Listen'; props: {minutes: number}}
  | {name: 'Chill Look Around'; props?: undefined}
  | {name: 'Chill Lang'; props: {lang: 'en' | 'vi'}}
  // Đồng hồ phin: bắt đầu / làm xong / dừng giữa chừng
  | {name: 'Chill Focus'; props: {action: 'start' | 'done' | 'stop'}}
  | {name: 'Chill Todo'; props: {action: 'add' | 'done' | 'book'}}
  | {name: 'Chill Shelf'; props: {action: 'gift' | 'open'}}
  | {name: 'Chill Quest'; props: {action: 'vote'; option: string}}
  | {name: 'Chill Play'; props: {track: string}}
  | {name: 'Chill Pet Cat'; props?: undefined}
  | {name: 'Chill Cat Toy'; props?: undefined}
  | {name: 'Chill Donate Open'; props?: {from: string}}
  | {name: 'Chill Board Open'; props?: undefined}
  | {name: 'Chill Donate Thanks'; props: {method: string}}
  | {name: 'Chill Updates Open'; props: {from: string}}
  | {name: 'Chill Update Try'; props: {action: string}}
  | {name: 'Chill Table'; props: {action: 'create' | 'join' | 'copy' | 'leave' | 'view' | 'wall-glass' | 'wall-brick'}}
  | {name: 'Chill Zen'; props: {on: 'on' | 'off'}}
  // Cảnh nào được thích: `place` = slug điểm đến trong Studio.
  // Chill Place: pick = tự bấm chọn cảnh · stop = tắt "tự chuyển ga" khi đang ở cảnh này
  // (chuyển ga tự động không tính). Chill Stay: mốc phút ngồi ở 1 cảnh trong 1 lần mở
  // trang — chỉ tính lúc tab đang hiện, chuyển ga đang tắt và nhìn thấy phố
  | {name: 'Chill Place'; props: {place: string; how: 'pick' | 'stop'}}
  | {name: 'Chill Stay'; props: {place: string; minutes: number}}
  // Bảng nhật ký: mở bảng / treo mẩu lên tường / cất mẩu vào sổ / báo cáo mẩu
  | {name: 'Chill Diary'; props: {action: 'open' | 'pin' | 'keep' | 'report'}}
  // Khách chọn món cà phê cho ly trên bàn nhật ký
  | {name: 'Chill Drink'; props: {drink: 'den' | 'sua' | 'bacxiu'}}
  | {name: 'Chill Guide'; props: {action: 'hint' | 'menu'; step: 'open' | 'phin' | 'drink' | 'cat' | 'diary' | 'settings' | 'shelf'}}
  // Khung nhúng /chill/embed: hiện lên / bấm phát lần đầu / bấm sang quán đầy đủ.
  // `host` = site đang nhúng (vd www.notion.so), "direct" = mở thẳng link không qua khung
  | {name: 'Chill Embed'; props: {action: 'view' | 'play' | 'open'; host: string}}

export function trackEvent({name, props}: AnalyticsEvent) {
  try {
    track(name, {...props, page: window.location.pathname})
  } catch {
    // Analytics lỗi không được ảnh hưởng tới trải nghiệm người dùng
  }
}
