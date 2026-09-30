// Toạ độ sprite trong public/chill/sprites.png (px thật, 1 ô lưới canvas = 2px).
// Sprite AI (Nano Banana qua Figma Weave), nhìn ngang, đáy căn sát mép dưới khung.
// Hầu hết hướng sang PHẢI; ngoại lệ hướng sang trái khai báo ở FACES_LEFT
// (scene.ts). Đi ngược chiều thì lật bằng code.
//   vendor-0…3, walker-0…3: chu kỳ bước chân · dog-0…3: chó chạy
//   dog-stand / dog-wag / dog-sniff / dog-sit: tư thế chó khi dừng

export const SPRITE_SRC = '/chill/sprites.png'

export const SPRITES = {
  'bike-cub': [0, 0, 38, 34],
  'bike-vespa': [40, 0, 36, 34],
  'bike-flowers': [78, 0, 42, 34],
  'bike-boxes': [122, 0, 42, 34],
  'bike-duo': [166, 0, 36, 34],
  'bike-poncho': [204, 0, 38, 34],
  'car-taxi': [244, 0, 78, 32],
  'car-hatch': [324, 0, 62, 28],
  'bus': [388, 0, 84, 44],
  'cyclo': [474, 0, 54, 40],
  'cyclist': [530, 0, 36, 34],
  'dog-0': [568, 0, 20, 14],
  'dog-1': [590, 0, 22, 14],
  'dog-2': [614, 0, 22, 12],
  'dog-3': [638, 0, 18, 14],
  'vendor-0': [658, 0, 30, 34],
  'vendor-1': [690, 0, 26, 36],
  'vendor-2': [718, 0, 30, 34],
  'vendor-3': [750, 0, 24, 34],
  'walker-0': [776, 0, 16, 34],
  'walker-1': [794, 0, 10, 34],
  'walker-2': [806, 0, 16, 34],
  'walker-3': [824, 0, 16, 34],
  'dog-stand': [842, 0, 16, 14],
  'dog-wag': [860, 0, 20, 14],
  'dog-sit': [882, 0, 16, 14],
  'dog-sniff': [900, 0, 20, 10],
} satisfies Record<string, [number, number, number, number]>

export type SpriteName = keyof typeof SPRITES
