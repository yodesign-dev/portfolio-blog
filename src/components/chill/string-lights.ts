// Dây đèn vẽ sẵn trong ảnh phòng (Bàn đêm): không treo thêm bóng, chỉ phủ lên bóng có sẵn cho
// chúng thở chậm, thỉnh thoảng một bóng chớp tắt mềm, và màu trôi nhẹ thành làn sóng dọc dây.
// Công tắc Studio stringLightsOpen (?lights=1 / ?lights=0 ghi đè).
//
// Toạ độ theo px đệm 1280×720 (= px ảnh nội thất), vẽ ngay sau ảnh nội thất. Lõi bóng đổi màu
// qua mặt nạ lấy từ chính độ sáng của bóng trong ảnh, nên tường quanh bóng không bị lem.
// Mọi nhịp tính từ đồng hồ cảnh + số thứ tự bóng, không giữ trạng thái.

export type Bulb = [number, number]

// Ấm quanh năm: vàng kem → vàng → hổ phách → hồng đào. Mùa Noel: đỏ, vàng ấm, xanh lá
const WARM = ['#fff0c4', '#ffd27a', '#ffb066', '#ffa48c']
const NOEL = ['#ff6a5c', '#ffd98a', '#7ee6a4', '#ffd98a']

// Chớp: tắt dịu trong 0,25 giây, mỗi bóng chừng 45–90 giây một lần (cả dây ~5 giây một lần)
const BLINK = 0.25
// Màu trôi hết một vòng bảng màu trong 22 giây, bóng sau trễ hơn bóng trước một chút
const DRIFT = 22
const WAVE = 0.07
// Ô mặt nạ quanh mỗi bóng (px ảnh)
const R = 14
const S = R * 2

const hash = (i: number, k: number) => {
  const s = Math.sin(i * 127.1 + k * 311.7) * 43758.5453
  return s - Math.floor(s)
}

const rgbOf = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))

function mix(palette: string[], u: number) {
  const n = palette.length
  const x = (((u % 1) + 1) % 1) * n
  const i = Math.floor(x)
  const k = x - i
  const s = k * k * (3 - 2 * k)
  const a = rgbOf(palette[i])
  const b = rgbOf(palette[(i + 1) % n])
  return a.map((v, j) => Math.round(v + (b[j] - v) * s))
}

// Độ sáng một bóng lúc t (0..1): thở chu kỳ 3–6 giây + thỉnh thoảng chớp
export function bulbLevel(i: number, t: number) {
  const period = 3 + 3 * hash(i, 1)
  const breath = 0.5 + 0.5 * Math.sin((t / period) * Math.PI * 2 + hash(i, 2) * 6.283)
  let level = 0.8 + 0.2 * breath
  // Mỗi bóng có cửa sổ 45–90 giây riêng, chớp một lần ở một chỗ ngẫu nhiên trong cửa sổ
  const every = 45 + 45 * hash(i, 3)
  const local = t + hash(i, 4) * every
  const win = Math.floor(local / every)
  const at = (0.15 + 0.7 * hash(i, 10 + win)) * every
  const d = local - win * every - at
  if (d > 0 && d < BLINK) level *= 1 - 0.7 * Math.sin((d / BLINK) * Math.PI)
  return level
}

function canvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}

let glow: HTMLCanvasElement | null = null
function glowSprite() {
  if (glow) return glow
  glow = canvas(64, 64)
  const g = glow.getContext('2d')!
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  grad.addColorStop(0, 'rgba(255,255,255,1)')
  grad.addColorStop(0.3, 'rgba(255,255,255,0.45)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 64, 64)
  return glow
}

export type StringLightsFrame = {
  t: number
  // Độ đậm của quầng theo giờ (đêm 1, chiều ~0,6, sáng ~0,35)
  glow: number
  noel: boolean
}

export class StringLights {
  private src = ''
  private bulbs: Bulb[] = []
  // Mặt nạ lõi sáng của từng bóng (trắng, alpha theo độ sáng trong ảnh)
  private masks: HTMLCanvasElement[] = []
  private work = canvas(64, 64)

  // Ảnh nội thất đã tải + toạ độ bóng; dựng lại mặt nạ khi đổi ảnh (anh / chị, đổi phòng)
  setSource(img: HTMLImageElement, bulbs: Bulb[]) {
    if (img.src === this.src && bulbs === this.bulbs) return
    this.src = img.src
    this.bulbs = bulbs
    this.masks = bulbs.map(([x, y]) => {
      const c = canvas(S, S)
      const g = c.getContext('2d', {willReadFrequently: true})!
      g.drawImage(img, x - R, y - R, S, S, 0, 0, S, S)
      const d = g.getImageData(0, 0, S, S)
      for (let p = 0; p < d.data.length; p += 4) {
        const lum = 0.3 * d.data[p] + 0.59 * d.data[p + 1] + 0.11 * d.data[p + 2]
        // Kem sáng của lõi → 1, quầng cam vẽ sẵn → một phần, tường → 0
        const a = Math.max(0, Math.min(1, (lum - 175) / 60))
        d.data[p] = d.data[p + 1] = d.data[p + 2] = 255
        d.data[p + 3] = Math.round(a * (d.data[p + 3] / 255) * 255)
      }
      g.putImageData(d, 0, 0)
      return c
    })
  }

  draw(ctx: CanvasRenderingContext2D, f: StringLightsFrame) {
    if (!this.masks.length) return
    const palette = f.noel ? NOEL : WARM
    const w = this.work.getContext('2d')!
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    this.bulbs.forEach(([x, y], i) => {
      const level = bulbLevel(i, f.t)
      const rgb = mix(palette, f.t / DRIFT - i * WAVE)
      const dim = 1 - level
      // Lõi: nhân màu qua mặt nạ (đổi màu lõi kem), tối đi khi bóng chớp tắt
      w.globalCompositeOperation = 'source-over'
      w.clearRect(0, 0, S, S)
      w.drawImage(this.masks[i], 0, 0)
      w.globalCompositeOperation = 'source-in'
      w.fillStyle = `rgb(${rgb.map((v) => Math.round(v * (1 - 0.6 * dim))).join(',')})`
      w.fillRect(0, 0, S, S)
      ctx.globalCompositeOperation = 'multiply'
      ctx.globalAlpha = 1
      ctx.drawImage(this.work, 0, 0, S, S, x - R, y - R, S, S)
      // Lớp màu ban đêm làm lõi bóng xỉn đi: cộng lại chút sáng cùng màu cho bóng "bật" lên
      ctx.globalCompositeOperation = 'lighter'
      ctx.globalAlpha = 0.45 * f.glow * level * level
      ctx.drawImage(this.work, 0, 0, S, S, x - R, y - R, S, S)
      // Quầng cùng màu, cộng sáng; tắt theo bóng khi chớp
      w.globalCompositeOperation = 'source-over'
      w.clearRect(0, 0, 64, 64)
      w.drawImage(glowSprite(), 0, 0)
      w.globalCompositeOperation = 'source-in'
      w.fillStyle = `rgb(${rgb.join(',')})`
      w.fillRect(0, 0, 64, 64)
      ctx.globalCompositeOperation = 'lighter'
      ctx.globalAlpha = 0.5 * f.glow * level * level
      ctx.drawImage(this.work, x - 28, y - 28, 56, 56)
    })
    ctx.restore()
  }
}
