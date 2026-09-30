// Toạ độ sprite trong public/chill/sprites.webp (px của atlas, ×2 so với px gốc
// 640×360 → 1 ô lưới canvas = 4px atlas). Sprite AI (Nano Banana 2 qua Figma
// Weave) vẽ lại ở độ chi tiết ×2, viền pixel cứng, 128 màu. Nhìn ngang, đáy căn
// sát mép dưới khung, TẤT CẢ hướng sang PHẢI — đi ngược chiều thì lật bằng code.
//   vendor-0…3, walker-0…3: chu kỳ bước chân · dog-0…3: chó chạy
//   dog-stand / dog-wag / dog-sniff / dog-sit: tư thế chó khi dừng

export const SPRITE_SRC = '/chill/sprites.webp'
// Số px atlas cho mỗi px gốc (canvas 640×360) — atlas ×2 thì sprite nét gấp đôi
export const SPRITE_SCALE = 2

export const SPRITES = {
  'bike-cub': [0, 18, 69, 75],
  'bike-vespa': [73, 16, 64, 77],
  'bike-flowers': [141, 11, 69, 82],
  'bike-boxes': [214, 3, 63, 90],
  'bike-duo': [281, 11, 60, 82],
  'bike-poncho': [345, 11, 63, 82],
  'car-taxi': [412, 30, 157, 63],
  'car-hatch': [573, 31, 112, 62],
  bus: [689, 0, 159, 93],
  cyclo: [852, 16, 112, 77],
  cyclist: [968, 25, 72, 68],
  'dog-0': [1044, 65, 44, 28],
  'dog-1': [1092, 65, 42, 28],
  'dog-2': [1138, 64, 45, 29],
  'dog-3': [1187, 64, 41, 29],
  'dog-stand': [1232, 65, 40, 28],
  'dog-wag': [1276, 60, 44, 33],
  'dog-sit': [1324, 60, 39, 33],
  'dog-sniff': [1367, 61, 44, 32],
  'vendor-0': [1415, 25, 44, 68],
  'vendor-1': [1463, 25, 35, 68],
  'vendor-2': [1502, 25, 34, 68],
  'vendor-3': [1540, 25, 40, 68],
  'walker-0': [1584, 25, 30, 68],
  'walker-1': [1618, 25, 31, 68],
  'walker-2': [1653, 25, 33, 68],
  'walker-3': [1690, 25, 29, 68],
} satisfies Record<string, [number, number, number, number]>

export type SpriteName = keyof typeof SPRITES
