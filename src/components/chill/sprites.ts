// Toạ độ sprite trong public/chill/sprites.png (px thật, 1 ô lưới canvas = 2px).
// Sprite AI (Nano Banana qua Figma Weave), nhìn ngang, đáy căn sát mép dưới khung.
// Hầu hết hướng sang PHẢI; ngoại lệ hướng sang trái khai báo ở FACES_LEFT
// (scene.ts). Đi ngược chiều thì lật bằng code.

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
  'vendor': [530, 0, 34, 34],
  'cyclist': [566, 0, 36, 34],
  'walker': [604, 0, 16, 34],
  'dog-0': [622, 0, 20, 14],
  'dog-1': [644, 0, 22, 14],
  'dog-2': [668, 0, 22, 12],
  'dog-3': [692, 0, 18, 14],
} satisfies Record<string, [number, number, number, number]>

export type SpriteName = keyof typeof SPRITES
