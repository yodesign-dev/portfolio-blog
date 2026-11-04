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
  // Phố cổ: khách đội mũ, khách cầm bản đồ, người chụp ảnh (khung cuối = lúc dừng)
  'tourist-0': [1727, 25, 31, 68],
  'tourist-1': [1762, 25, 27, 68],
  'tourist-2': [1793, 25, 34, 68],
  'tourist-3': [1831, 25, 30, 68],
  'tourist-stop': [1865, 25, 23, 68],
  'mapman-0': [1892, 25, 33, 68],
  'mapman-1': [1929, 25, 33, 68],
  'mapman-2': [1966, 25, 30, 68],
  'mapman-3': [1929, 25, 33, 68],
  'mapman-stop': [2000, 25, 29, 68],
  'photog-0': [2033, 25, 32, 68],
  'photog-1': [2069, 25, 32, 68],
  'photog-2': [2105, 25, 33, 68],
  'photog-3': [2142, 25, 31, 68],
  'photog-stop': [2177, 25, 29, 68],
  // Phố cổ: chàng trai balo, cô gái cầm đèn
  'packer-0': [2716, 25, 37, 68],
  'packer-1': [2757, 25, 29, 68],
  'packer-2': [2790, 25, 38, 68],
  'packer-3': [2832, 25, 30, 68],
  'packer-stop': [2866, 23, 37, 70],
  'lanterner-0': [2907, 25, 42, 68],
  'lanterner-1': [2953, 25, 43, 68],
  'lanterner-2': [3000, 25, 43, 68],
  'lanterner-3': [2953, 25, 43, 68],
  'lanterner-stop': [3047, 25, 41, 68],
  // Phố cổ: cô gái áo dài, cặp lớn tuổi, bạn chụp selfie
  'aodai-0': [2214, 25, 33, 68],
  'aodai-1': [2251, 25, 31, 68],
  'aodai-2': [2214, 25, 33, 68],
  'aodai-3': [2251, 25, 31, 68],
  'aodai-stop': [2286, 21, 33, 72],
  'elders-0': [2323, 25, 46, 68],
  'elders-1': [2373, 24, 37, 69],
  'elders-2': [2414, 25, 45, 68],
  'elders-3': [2463, 25, 34, 68],
  'elders-stop': [2501, 24, 60, 69],
  'selfie-0': [2565, 25, 34, 68],
  'selfie-1': [2603, 25, 29, 68],
  'selfie-2': [2636, 25, 34, 68],
  'selfie-3': [2603, 25, 29, 68],
  'selfie-stop': [2674, 24, 34, 69],
} satisfies Record<string, [number, number, number, number]>

export type SpriteName = keyof typeof SPRITES
