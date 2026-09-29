// Các điểm đến của trang /chill — mỗi điểm đến là 1 cảnh phố ngoài cửa sổ
// quán (nội thất giữ nguyên). Cùng bố cục với ảnh Hà Nội để lòng đường khớp
// làn xe máy (xem STREET_IMG trong scene.ts).
//
// 2 nguồn, nối tiếp nhau (xem src/app/chill/page.tsx):
// - Có sẵn trong code: ảnh 560×238 ở public/chill/scenes/<id>-<giờ>.webp
// - Thêm trong Sanity Studio ("Chill · Điểm đến"), ảnh lấy từ Sanity CDN

import type {TimeOfDay} from './scene'

export type Destination = {
  id: string
  name: string
  region: string
  // Múi giờ cho đồng hồ trên đầu trang
  timeZone: string
  // URL ảnh phố theo từng thời điểm
  streets: Record<TimeOfDay, string>
  // Độ nghiêng của lòng đường (px dọc / px ngang, lưới 320×180) cho cảnh phố
  // dốc — làn xe và vỉa hè nghiêng theo, tâm xoay ở giữa khung. Âm = dốc lên phải.
  tilt?: number
  // Dời riêng làn xe lên/xuống (px) nếu lòng đường trong ảnh cao/thấp hơn Hà Nội
  laneShift?: number
}

const local = (id: string): Record<TimeOfDay, string> => ({
  morning: `/chill/scenes/${id}-morning.webp`,
  afternoon: `/chill/scenes/${id}-afternoon.webp`,
  night: `/chill/scenes/${id}-night.webp`,
})

export const DESTINATIONS: Destination[] = [
  {id: 'hanoi', name: 'Hà Nội', region: 'Việt Nam', timeZone: 'Asia/Ho_Chi_Minh', streets: local('hanoi')},
  {id: 'dalat', name: 'Đà Lạt', region: 'Việt Nam', timeZone: 'Asia/Ho_Chi_Minh', streets: local('dalat'), tilt: -0.075, laneShift: -3},
  {id: 'saigon', name: 'Sài Gòn', region: 'Việt Nam', timeZone: 'Asia/Ho_Chi_Minh', streets: local('saigon')},
  {id: 'hue', name: 'Huế', region: 'Việt Nam', timeZone: 'Asia/Ho_Chi_Minh', streets: local('hue')},
]
