// Các điểm đến của trang /chill — mỗi điểm đến là 1 cảnh phố ngoài cửa sổ
// quán (nội thất giữ nguyên). Cùng bố cục với ảnh Hà Nội để lòng đường khớp
// làn xe máy (xem STREET_IMG trong scene.ts).
//
// Danh sách thật quản lý trong Sanity Studio ("Chill · Điểm đến"), ảnh từ Sanity CDN
// (xem src/app/chill/page.tsx). Ở đây chỉ còn Hà Nội dự phòng khi Sanity không trả về gì.

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
  // "countryside" = cảnh đồng quê: đường đất chỉ có xe máy / xe đạp, lúa lắc lư theo
  // gió, không có các cảnh nhỏ của phố (shipper, cặp đôi, bảng menu…)
  scenery?: 'street' | 'countryside'
}

const local = (id: string): Record<TimeOfDay, string> => ({
  morning: `/chill/scenes/${id}-morning.webp`,
  afternoon: `/chill/scenes/${id}-afternoon.webp`,
  night: `/chill/scenes/${id}-night.webp`,
})

export const DESTINATIONS: Destination[] = [
  {id: 'hanoi', name: 'Hà Nội', region: 'Việt Nam', timeZone: 'Asia/Ho_Chi_Minh', streets: local('hanoi')},
]
