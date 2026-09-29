// Các điểm đến của trang /chill — mỗi điểm đến là 1 cảnh phố ngoài cửa sổ
// quán (nội thất giữ nguyên). Ảnh 560×238 trong public/chill/scenes/, đặt
// tên `<id>-<morning|afternoon|night>.webp`, cùng bố cục với ảnh Hà Nội để
// lòng đường khớp làn xe máy (xem STREET_IMG trong scene.ts).

export type Destination = {
  id: string
  name: string
  region: string
  // Múi giờ cho đồng hồ trên đầu trang
  timeZone: string
  // Độ nghiêng của lòng đường (px dọc / px ngang, lưới 320×180) cho cảnh phố
  // dốc — làn xe và vỉa hè nghiêng theo, tâm xoay ở giữa khung. Âm = dốc lên phải.
  tilt?: number
  // Dời riêng làn xe lên/xuống (px) nếu lòng đường trong ảnh cao/thấp hơn Hà Nội
  laneShift?: number
}

export const DESTINATIONS: Destination[] = [
  {id: 'hanoi', name: 'Hà Nội', region: 'Việt Nam', timeZone: 'Asia/Ho_Chi_Minh'},
  {id: 'dalat', name: 'Đà Lạt', region: 'Việt Nam', timeZone: 'Asia/Ho_Chi_Minh', tilt: -0.075, laneShift: -3},
  {id: 'saigon', name: 'Sài Gòn', region: 'Việt Nam', timeZone: 'Asia/Ho_Chi_Minh'},
  {id: 'hue', name: 'Huế', region: 'Việt Nam', timeZone: 'Asia/Ho_Chi_Minh'},
]

export const streetSrc = (id: string, time: string) => `/chill/scenes/${id}-${time}.webp`
