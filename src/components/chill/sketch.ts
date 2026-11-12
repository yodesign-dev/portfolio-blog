// Trang sketchbook trên giá vẽ (Cửa sổ quán, bản chị): ký hoạ bút chì chính con phố đang ở
// ngoài cửa sổ, nét hiện dần theo tiến độ — pha phin thì vẽ theo phin (phin xong = bức xong),
// không pha thì một bức mỗi 25 phút. Luôn vẽ theo ảnh ban ngày; đổi điểm đến là sang trang mới.
//
// Trang trong ảnh tĩnh và trong từng khung người ngồi đều trong suốt (khoét nền xanh), nên trang
// vẽ DƯỚI ảnh nội thất: viền giấy, giá vẽ và bàn tay cầm bút nằm đè lên. Toạ độ theo px đệm
// 1280×720. Trang là hình bình hành nghiêng (giá vẽ ngả ra sau): vẽ phẳng rồi uốn từng pixel
// (nearest) cho nét giữ đúng chất pixel.

type Pt = {x: number; y: number}
export type PageQuad = {tl: Pt; tr: Pt; bl: Pt}

// Màu giấy kem, chì than
const PAPER = [243, 234, 216]
const LEAD = [64, 58, 54]
// Một bức khi không pha phin (giây) và lúc giữ bức đã xong trước khi lật trang
export const SKETCH_SECONDS = 25 * 60
const HOLD = 45

const canvas = (w: number, h: number) => {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}

const noise = (x: number, y: number) => {
  const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453
  return s - Math.floor(s)
}

// Tiến độ khi không pha phin: vẽ trong 25 phút, giữ bức xong 45 giây rồi sang trang
export function idleProgress(t: number) {
  const local = t % (SKETCH_SECONDS + HOLD)
  return Math.min(1, local / SKETCH_SECONDS)
}

export class SketchPage {
  private w: number
  private h: number
  // Mỗi pixel trang: độ đậm chì (0…1) và thứ tự hiện (0…1)
  private ink: Float32Array
  private order: Float32Array
  private flat: HTMLCanvasElement
  private warped: HTMLCanvasElement
  private box: {x: number; y: number; w: number; h: number}
  private srcKey = ''
  private drawnKey = ''

  constructor(readonly quad: PageQuad) {
    const {tl, tr, bl} = quad
    this.w = Math.round(Math.hypot(tr.x - tl.x, tr.y - tl.y))
    this.h = Math.round(Math.hypot(bl.x - tl.x, bl.y - tl.y))
    this.ink = new Float32Array(this.w * this.h)
    this.order = new Float32Array(this.w * this.h).fill(2)
    this.flat = canvas(this.w, this.h)
    const br = {x: tr.x + bl.x - tl.x, y: tr.y + bl.y - tl.y}
    const xs = [tl.x, tr.x, bl.x, br.x]
    const ys = [tl.y, tr.y, bl.y, br.y]
    // Nới 5 px mỗi phía: mép trang nằm dưới viền giấy, không hở nền phố
    const x0 = Math.floor(Math.min(...xs)) - 5
    const y0 = Math.floor(Math.min(...ys)) - 5
    this.box = {x: x0, y: y0, w: Math.ceil(Math.max(...xs)) + 5 - x0, h: Math.ceil(Math.max(...ys)) + 5 - y0}
    this.warped = canvas(this.box.w, this.box.h)
  }

  // Dựng bản ký hoạ từ ảnh phố (đã tải, đọc được pixel). Ảnh không đọc được (thiếu CORS) thì
  // giữ bản cũ — trang vẫn là giấy trắng hoặc bức trước
  setSource(img: HTMLImageElement, key: string) {
    if (key === this.srcKey || !img.naturalWidth) return
    const {w, h} = this
    const c = canvas(w, h)
    const g = c.getContext('2d', {willReadFrequently: true})!
    // Cắt dọc giữa ảnh phố theo tỉ lệ trang, bỏ bớt trời và mép đường
    const iw = img.naturalWidth
    const ih = img.naturalHeight
    const ch = ih * 0.82
    const cw = Math.min(iw, (ch * w) / h)
    g.imageSmoothingEnabled = true
    g.drawImage(img, (iw - cw) / 2, ih * 0.08, cw, ch, 0, 0, w, h)
    let data: Uint8ClampedArray
    try {
      data = g.getImageData(0, 0, w, h).data
    } catch {
      return
    }
    this.srcKey = key
    this.drawnKey = ''
    const lum = new Float32Array(w * h)
    for (let i = 0; i < w * h; i++) lum[i] = (0.3 * data[i * 4] + 0.59 * data[i * 4 + 1] + 0.11 * data[i * 4 + 2]) / 255
    const at = (x: number, y: number) => lum[Math.min(h - 1, Math.max(0, y)) * w + Math.min(w - 1, Math.max(0, x))]
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x
        // Nét viền (Sobel)
        const gx = at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x - 1, y) - at(x - 1, y + 1)
        const gy = at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x, y - 1) - at(x + 1, y - 1)
        const edge = Math.min(1, Math.max(0, (Math.hypot(gx, gy) - 0.35) / 0.6))
        // Đánh bóng gạch chéo chỗ tối: tối vừa một chiều, tối hẳn thêm chiều kia
        const dark = 1 - lum[i]
        let hatch = 0
        if (dark > 0.55 && (x + y) % 4 === 0) hatch = 0.45
        if (dark > 0.72 && (x - y + 400) % 4 === 0) hatch = 0.55
        const v = Math.max(edge * 0.9, hatch)
        this.ink[i] = v > 0.12 ? v : 0
        // Thứ tự vẽ: phác nét viền từ trên xuống theo từng cụm, đánh bóng sau
        const cluster = noise(x >> 3, y >> 3)
        const base = 0.62 * (y / h) + 0.18 * cluster + 0.02 * noise(x, y)
        this.order[i] = edge * 0.9 >= hatch ? base * 0.78 : 0.22 + base * 0.78
      }
    }
  }

  // Vẽ trang (dưới ảnh nội thất). tint: tô màu theo giờ / thời tiết như ảnh nội thất; tintKey
  // đổi thì tô lại
  draw(ctx: CanvasRenderingContext2D, progress: number, tint: (c: CanvasRenderingContext2D, w: number, h: number) => void, tintKey: string) {
    const step = Math.round(Math.min(1, Math.max(0, progress)) * 400)
    const key = `${this.srcKey}|${step}|${tintKey}`
    if (key !== this.drawnKey) {
      this.drawnKey = key
      this.render(step / 400)
      this.warp()
      tint(this.warped.getContext('2d')!, this.box.w, this.box.h)
    }
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.drawImage(this.warped, this.box.x, this.box.y)
    ctx.restore()
  }

  private render(progress: number) {
    const {w, h} = this
    const g = this.flat.getContext('2d')!
    const img = g.createImageData(w, h)
    const d = img.data
    for (let i = 0; i < w * h; i++) {
      const x = i % w
      const y = (i / w) | 0
      // Thớ giấy rất nhẹ
      const grain = (noise(x * 3.1, y * 1.7) - 0.5) * 6
      let a = 0
      if (this.ink[i] && this.order[i] <= progress) {
        a = this.ink[i]
        // Nét vừa vẽ đậm hơn một chút, như chì mới
        if (progress - this.order[i] < 0.015) a = Math.min(1, a + 0.15)
      }
      for (let k = 0; k < 3; k++) d[i * 4 + k] = Math.round(PAPER[k] + grain + (LEAD[k] - PAPER[k]) * a)
      d[i * 4 + 3] = 255
    }
    g.putImageData(img, 0, 0)
  }

  // Uốn trang phẳng vào hình bình hành: mỗi pixel đích tìm pixel nguồn (nearest)
  private warp() {
    const {tl, tr, bl} = this.quad
    const {w, h, box} = this
    const ux = (tr.x - tl.x) / w
    const uy = (tr.y - tl.y) / w
    const vx = (bl.x - tl.x) / h
    const vy = (bl.y - tl.y) / h
    const det = ux * vy - uy * vx
    const src = this.flat.getContext('2d')!.getImageData(0, 0, w, h).data
    const g = this.warped.getContext('2d')!
    const out = g.createImageData(box.w, box.h)
    const d = out.data
    for (let y = 0; y < box.h; y++) {
      for (let x = 0; x < box.w; x++) {
        const px = box.x + x + 0.5 - tl.x
        const py = box.y + y + 0.5 - tl.y
        // Toạ độ trong trang (nới 4 px để không hở mép), kẹp vào trong
        const s = Math.floor((px * vy - py * vx) / det)
        const t = Math.floor((ux * py - uy * px) / det)
        if (s < -4 || t < -4 || s > w + 3 || t > h + 3) continue
        const si = (Math.min(h - 1, Math.max(0, t)) * w + Math.min(w - 1, Math.max(0, s))) * 4
        const di = (y * box.w + x) * 4
        d[di] = src[si]
        d[di + 1] = src[si + 1]
        d[di + 2] = src[si + 2]
        d[di + 3] = 255
      }
    }
    g.putImageData(out, 0, 0)
  }
}
