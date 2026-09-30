// Lọ tip trên bàn quán /chill + ly cà phê sữa đá của người vừa mời — vẽ bằng code
// (không cần sprite). Vẽ quanh gốc (0, 0) = giữa đáy rồi phóng ×ART_SCALE theo
// px gốc 640×360 → 1 "pixel" nét nhất (0.5) = 2 px thật, vẫn sắc cạnh.
//
// Lọ đầy dần theo số ly Bin đã xác nhận "Đã nhận tiền" (xu vàng + tờ tiền polymer
// xanh / hồng / lam). scene.ts vẽ vào 1 lớp riêng rồi tô màu theo giờ như nội thất.

type Ctx = CanvasRenderingContext2D

// Số ly để lọ đầy (ly thứ 1 đã thấy có vài đồng dưới đáy)
const FULL_AT = 40

// Mỗi đơn vị vẽ = 2 px gốc
const ART_SCALE = 2
const JAR_W = 12
const JAR_H = 15

// Vùng bấm quanh lọ, theo px gốc (đáy giữa lọ ở x, y)
export const jarHitBox = (x: number, y: number) => ({
  x: x - (JAR_W * ART_SCALE) / 2 - 2,
  y: y - JAR_H * ART_SCALE - 3,
  w: JAR_W * ART_SCALE + 4,
  h: JAR_H * ART_SCALE + 5,
})

function at(ctx: Ctx, x: number, y: number, draw: () => void) {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(ART_SCALE, ART_SCALE)
  draw()
  ctx.restore()
}

// Bitmap 3×5 cho chữ "TIP" trên nhãn giấy
const GLYPHS: Record<string, string[]> = {
  T: ['111', '010', '010', '010', '010'],
  I: ['111', '010', '010', '010', '111'],
  P: ['110', '101', '110', '100', '100'],
}

// Hash cố định theo ô → mỗi lần vẽ lại, đồ trong lọ nằm y chỗ cũ
const cell = (i: number, j: number) => {
  let h = (i * 374761393 + j * 668265263) >>> 0
  h = ((h ^ (h >>> 13)) * 1274126177) >>> 0
  return (h >>> 8) / 0xffffff
}

const COINS = ['#e8b64a', '#c99530', '#f3d27a']
const BILLS = ['#7bb98a', '#e39bb0', '#7fa6d6', '#c98b6b']

function fill(ctx: Ctx, color: string, x: number, y: number, w: number, h: number, alpha = 1) {
  ctx.globalAlpha = alpha
  ctx.fillStyle = color
  ctx.fillRect(x, y, w, h)
  ctx.globalAlpha = 1
}

export function jarLevel(cups: number) {
  return cups <= 0 ? 0 : Math.min(1, 0.12 + cups / FULL_AT)
}

// (x, y) = giữa đáy lọ, px gốc
export function drawTipJar(ctx: Ctx, x: number, y: number, cups: number) {
  at(ctx, x, y, () => jar(ctx, 0, 0, cups))
}

function jar(ctx: Ctx, x: number, y: number, cups: number) {
  const left = x - JAR_W / 2
  const top = y - JAR_H
  const bodyTop = top + 3

  // Bóng đổ trên mặt bàn
  fill(ctx, '#1a0f08', left - 1, y - 0.5, JAR_W + 2, 1, 0.35)

  // Đồ bên trong: đáy lên tới mức, mép trên lởm chởm ±1 ô
  const inner = JAR_H - 5
  const level = jarLevel(cups)
  if (level > 0) {
    for (let i = 0; i < JAR_W - 2; i++) {
      const colH = Math.max(1, Math.round(level * inner + (cell(i, 99) - 0.5) * 2))
      for (let j = 0; j < colH; j++) {
        const r = cell(i, j)
        const palette = r < 0.55 ? COINS : BILLS
        fill(ctx, palette[Math.floor(cell(j, i) * palette.length)], left + 1 + i, y - 1 - (j + 1), 1, 1)
      }
    }
  }

  // Thân lọ thuỷ tinh: nền trong mờ, 2 mép, đáy, vai bo tròn
  fill(ctx, '#dfeef2', left + 1, bodyTop, JAR_W - 2, y - 1 - bodyTop, 0.16)
  fill(ctx, '#cfe6ec', left, bodyTop + 1, 1, y - bodyTop - 2, 0.7)
  fill(ctx, '#a9c6ce', left + JAR_W - 1, bodyTop + 1, 1, y - bodyTop - 2, 0.7)
  fill(ctx, '#a9c6ce', left + 1, y - 1, JAR_W - 2, 1, 0.75)
  fill(ctx, '#cfe6ec', left + 1, bodyTop, JAR_W - 2, 1, 0.55)
  // Cổ lọ + nắp gỗ buộc dây
  fill(ctx, '#cfe6ec', left + 2, top + 2, JAR_W - 4, 1, 0.6)
  fill(ctx, '#8a5a34', left + 1.5, top, JAR_W - 3, 2)
  fill(ctx, '#5c3a20', left + 1.5, top + 1.5, JAR_W - 3, 0.5)
  fill(ctx, '#b07a4a', left + 2, top, JAR_W - 4, 0.5)
  // Vệt sáng trên thuỷ tinh
  fill(ctx, '#ffffff', left + 1.5, bodyTop + 2, 0.5, y - bodyTop - 5, 0.5)
  fill(ctx, '#ffffff', left + 2.5, bodyTop + 2, 0.5, 1.5, 0.4)

  // Nhãn giấy kraft "TIP" dán trước lọ
  const tagW = 7
  const tagX = x - tagW / 2
  const tagY = bodyTop + 3
  fill(ctx, '#e9d4a6', tagX, tagY, tagW, 4)
  fill(ctx, '#b89868', tagX, tagY + 3.5, tagW, 0.5)
  let gx = tagX + 0.75
  for (const ch of 'TIP') {
    GLYPHS[ch].forEach((row, r) =>
      [...row].forEach((on, c) => on === '1' && fill(ctx, '#5a3a22', gx + c * 0.5, tagY + 0.5 + r * 0.5, 0.5, 0.5)),
    )
    gx += 2
  }
  // Tim đỏ nhỏ góc nhãn
  fill(ctx, '#d9534f', tagX + tagW - 1.5, tagY - 0.5, 1, 0.5)
}

// Ly cà phê sữa đá: (x, y) = giữa đáy ly, px gốc
export function drawIcedCoffee(ctx: Ctx, x: number, y: number) {
  at(ctx, x, y, () => cup(ctx, 0, 0))
}

function cup(ctx: Ctx, x: number, y: number) {
  const w = 7
  const h = 10
  const left = x - w / 2
  const top = y - h
  fill(ctx, '#1a0f08', left - 1, y - 0.5, w + 2, 1, 0.35)
  // Cà phê (đậm dưới, sữa nhạt hơn ở trên) + đá
  fill(ctx, '#4e2a18', left + 0.5, top + 4, w - 1, h - 5)
  fill(ctx, '#8a5a3a', left + 0.5, top + 2, w - 1, 2)
  fill(ctx, '#c8a07a', left + 0.5, top + 2, w - 1, 0.5)
  fill(ctx, '#eef6f8', left + 1, top + 1.5, 2, 2, 0.85)
  fill(ctx, '#eef6f8', left + 3.5, top + 2.5, 2, 1.5, 0.8)
  fill(ctx, '#eef6f8', left + 1.5, top + 5, 1.5, 1.5, 0.35)
  // Ống hút đỏ
  fill(ctx, '#d8453a', x + 1, top - 4, 1, 6)
  fill(ctx, '#d8453a', x + 1, top - 4, 2.5, 1)
  fill(ctx, '#f07a6a', x + 1, top - 4, 0.5, 5)
  // Thành ly thuỷ tinh + giọt nước đọng
  fill(ctx, '#cfe3e8', left, top + 0.5, 0.5, h - 1, 0.7)
  fill(ctx, '#a9c6ce', left + w - 0.5, top + 0.5, 0.5, h - 1, 0.7)
  fill(ctx, '#a9c6ce', left + 0.5, y - 1, w - 1, 1, 0.8)
  fill(ctx, '#ffffff', left, top, w, 0.5, 0.6)
  fill(ctx, '#ffffff', left + 1, top + 6, 0.5, 0.5, 0.7)
  fill(ctx, '#ffffff', left + 5, top + 7.5, 0.5, 0.5, 0.6)
}

// Đồng xu rơi vào lọ lúc người xem bấm "I've sent it" — `t` giây kể từ lúc thả.
// Trả về false khi xong hiệu ứng.
export function drawCoinDrop(ctx: Ctx, x: number, y: number, t: number) {
  let alive = false
  at(ctx, x, y, () => (alive = coin(ctx, 0, 0, t)))
  return alive
}

function coin(ctx: Ctx, x: number, y: number, t: number) {
  const top = y - JAR_H
  const fall = 0.55
  if (t < fall) {
    const k = t / fall
    const cy = top - 22 + k * k * 26
    const wide = Math.floor(t * 12) % 2 === 0
    fill(ctx, '#f3d27a', x - (wide ? 1.5 : 0.5), cy, wide ? 3 : 1, 3)
    fill(ctx, '#c99530', x - (wide ? 1.5 : 0.5), cy + 2.5, wide ? 3 : 1, 0.5)
    return true
  }
  const s = (t - fall) / 0.8
  if (s > 1) return false
  // Lấp lánh quanh miệng lọ
  const a = 1 - s
  for (const [dx, dy] of [
    [-6, -3],
    [6, -4],
    [0, -7],
  ]) {
    const r = 0.5 + s * 1.5
    fill(ctx, '#fff4c8', x + dx * (0.6 + s), top + dy * (0.6 + s) - r / 2, 0.5, r, a)
    fill(ctx, '#fff4c8', x + dx * (0.6 + s) - r / 2 + 0.25, top + dy * (0.6 + s), r, 0.5, a)
  }
  return true
}
