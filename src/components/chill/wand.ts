// Cần câu lông vũ để trêu mèo (/chill, sau công tắc Studio catToyOpen).
//
// Đầu dây theo tay người xem (chuột / ngón tay), dây là chuỗi Verlet 10 đốt, cuối dây
// là chùm lông vũ. Lông vũ nằm im được trên bậu (có ma sát), bị kéo xuống dưới mép bậu
// thì khuất (mèo coi như mồi trốn đi). Mọi toạ độ theo px gốc 640×360.

type Pt = {x: number; y: number}
type Node = Pt & {px: number; py: number}

const N = 10
const SEG = 4.5
const GRAVITY = 560

// Chùm lông: [lệch góc, dài, màu ngày, màu đêm]
const PLUMES: [number, number, string, string][] = [
  [-0.55, 7, '#e8697d', '#a9505f'],
  [0, 9.5, '#f4a3b0', '#b27a84'],
  [0.55, 7, '#4fb8b2', '#3a8682'],
  [0.28, 6, '#ffd27a', '#b8985a'],
  [-0.28, 8, '#f08a5c', '#ad6545'],
]

export type ToySpot = {
  // Cần câu dựng cạnh mèo: gốc cán → đầu cán
  base: Pt
  tip: Pt
  // Mép trước bậu: lông vũ xuống dưới đây thì khuất
  hideY: number
}

export class Wand {
  private rope: Node[] = []
  hand: Pt
  // Mặt bậu mèo nằm: lông vũ rơi xuống thì nằm lại trên đó
  private floor: number
  private hideY: number
  // Đang bị mèo ngậm: cuối dây ghim vào miệng mèo
  pin: Pt | null = null
  x = 0
  y = 0
  vx = 0
  vy = 0

  constructor(spot: ToySpot, floor: number) {
    this.hand = {...spot.tip}
    this.floor = floor
    this.hideY = spot.hideY
    for (let i = 0; i < N; i++) this.rope.push({x: spot.tip.x, y: spot.tip.y + i * SEG, px: spot.tip.x, py: spot.tip.y + i * SEG})
    const end = this.rope[N - 1]
    this.x = end.x
    this.y = end.y
  }

  get speed() {
    return Math.hypot(this.vx, this.vy)
  }

  // Khuất dưới mép bậu
  get hidden() {
    return this.y > this.hideY - 2
  }

  // Mèo khều trúng: hất lông vũ (vận tốc px / frame Verlet)
  kick(dx: number, dy: number) {
    const end = this.rope[N - 1]
    const near = this.rope[N - 2]
    end.px = end.x - dx
    end.py = end.y - dy
    near.px = near.x - dx / 2
    near.py = near.y - dy / 2
  }

  update(dt: number) {
    if (dt <= 0) return
    const rope = this.rope
    const g = GRAVITY * dt * dt
    for (let i = 1; i < N; i++) {
      const n = rope[i]
      const vx = (n.x - n.px) * 0.985
      const vy = (n.y - n.py) * 0.985
      n.px = n.x
      n.py = n.y
      n.x += vx
      n.y += vy + g
    }
    // Tay đang ở trên mặt bậu thì lông vũ chạm bậu, kéo xuống dưới thì rơi khuất sau mép
    const onSill = this.hand.y < this.floor - 2
    for (let k = 0; k < 8; k++) {
      rope[0].x = this.hand.x
      rope[0].y = this.hand.y
      for (let i = 1; i < N; i++) {
        const p = rope[i - 1]
        const n = rope[i]
        const dx = n.x - p.x
        const dy = n.y - p.y
        const d = Math.hypot(dx, dy) || 1
        const diff = (d - SEG) / d
        if (i === 1) {
          n.x -= dx * diff
          n.y -= dy * diff
        } else {
          p.x += dx * diff * 0.5
          p.y += dy * diff * 0.5
          n.x -= dx * diff * 0.5
          n.y -= dy * diff * 0.5
        }
      }
      if (this.pin) {
        rope[N - 1].x = this.pin.x
        rope[N - 1].y = this.pin.y
      }
      if (onSill) for (let i = 1; i < N; i++) if (rope[i].y > this.floor - 1.5) rope[i].y = this.floor - 1.5
    }
    // Ma sát trên mặt bậu → lông vũ nằm im được
    if (onSill) {
      for (let i = 1; i < N; i++) {
        const n = rope[i]
        if (n.y >= this.floor - 1.6) n.px = n.x - (n.x - n.px) * 0.55
      }
    }
    rope[0].px = rope[0].x = this.hand.x
    rope[0].py = rope[0].y = this.hand.y
    const end = rope[N - 1]
    this.vx += ((end.x - this.x) / dt - this.vx) * 0.25
    this.vy += ((end.y - this.y) / dt - this.vy) * 0.25
    this.x = end.x
    this.y = end.y
  }

  // Cán + dây + lông vũ, cắt mọi thứ dưới mép bậu
  draw(ctx: CanvasRenderingContext2D, t: number, night: boolean) {
    ctx.save()
    ctx.beginPath()
    ctx.rect(0, 0, 640, this.hideY)
    ctx.clip()
    if (!this.pin) drawRod(ctx, this.hand.x, this.hand.y, this.hand.x + 26, this.hand.y - 48, night)
    for (let i = 1; i < N; i++) line(ctx, this.rope[i - 1].x, this.rope[i - 1].y, this.rope[i].x, this.rope[i].y, night ? 'rgba(200,190,175,.75)' : 'rgba(240,228,210,.9)')
    const end = this.rope[N - 1]
    const near = this.rope[N - 2]
    drawBell(ctx, this.rope[N - 3].x, this.rope[N - 3].y, night)
    drawFeather(ctx, end.x, end.y, Math.atan2(end.y - near.y, end.x - near.x), 0.12 + Math.min(0.4, this.speed / 400), t, night)
    ctx.restore()
  }
}

// Cần câu dựng chờ (chưa ai cầm)
export function drawWandProp(ctx: CanvasRenderingContext2D, spot: ToySpot, t: number, night: boolean) {
  const {base, tip} = spot
  drawRod(ctx, base.x, base.y, tip.x, tip.y, night)
  // Dây võng xuống, lông vũ đung đưa nhẹ ngang tầm giữa cán
  const fx = tip.x - 5 + Math.sin(t * 1.3) * 1.5
  const fy = tip.y + 16
  line(ctx, tip.x, tip.y, fx, fy, night ? 'rgba(200,190,175,.6)' : 'rgba(240,228,210,.8)')
  drawBell(ctx, tip.x + (fx - tip.x) * 0.7, tip.y + (fy - tip.y) * 0.7, night)
  drawFeather(ctx, fx, fy, Math.PI / 2 + 0.2, 0.05, t, night)
}

// Vùng bấm của cần câu đang dựng (px gốc)
export function wandPropBox({base, tip}: ToySpot) {
  const x = Math.min(base.x, tip.x) - 12
  const y = Math.min(base.y, tip.y) - 6
  return {x, y, w: Math.abs(tip.x - base.x) + 24, h: Math.abs(base.y - tip.y) + 26}
}

// Viền nâu đậm chung cho cán, chuông, lông vũ (giống nét viền của mèo)
const OUTLINE = '#3a2116'
const OUTLINE_NIGHT = '#1c110c'

// Cán sọc kẹo hồng-kem, tay cầm gỗ ở gốc, ngôi sao trên đầu cán
function drawRod(ctx: CanvasRenderingContext2D, bx: number, by: number, tx: number, ty: number, night: boolean) {
  const len = Math.hypot(tx - bx, ty - by)
  const n = Math.ceil(len * 2)
  line(ctx, bx - 0.5, by - 0.5, tx - 0.5, ty - 0.5, night ? OUTLINE_NIGHT : OUTLINE, 2.5)
  for (let i = 0; i <= n; i++) {
    const d = (i / n) * len
    // 9px gốc là tay cầm gỗ, còn lại sọc 3px
    const color = d < 9 ? (night ? '#6b4a2e' : '#a8713f') : Math.floor((d - 9) / 3) % 2 ? (night ? '#a5707c' : '#f29bb0') : night ? '#b9ab9a' : '#fff1dc'
    ctx.fillStyle = color
    ctx.fillRect(Math.round((bx + ((tx - bx) * i) / n) * 2) / 2, Math.round((by + ((ty - by) * i) / n) * 2) / 2, 1.5, 1.5)
  }
  sprite(ctx, STAR, tx, ty, night ? '#b8985a' : '#ffd27a', night)
}

// Chuông vàng nhỏ trên dây
function drawBell(ctx: CanvasRenderingContext2D, x: number, y: number, night: boolean) {
  sprite(ctx, BELL, x, y, night ? '#9c8442' : '#f2c14e', night)
  ctx.fillStyle = night ? OUTLINE_NIGHT : OUTLINE
  ctx.fillRect(Math.round(x * 2) / 2 - 0.5, Math.round(y * 2) / 2 + 1, 1, 1)
}

function drawFeather(ctx: CanvasRenderingContext2D, x: number, y: number, ang: number, wobble: number, t: number, night: boolean) {
  const plumes = PLUMES.map(([da, len, day, dark], i) => {
    const a = ang + da + Math.sin(t * 9 + i * 1.7) * wobble
    const l = len * 1.6
    return {x1: x + Math.cos(a) * l, y1: y + Math.sin(a) * l, color: night ? dark : day}
  })
  // Viền trước, màu sau → các sợi lông có nét viền liền nhau như sprite
  for (const p of plumes) line(ctx, x - 0.5, y - 0.5, p.x1 - 0.5, p.y1 - 0.5, night ? OUTLINE_NIGHT : OUTLINE, 2)
  for (const p of plumes) line(ctx, x, y, p.x1, p.y1, p.color, 1)
  // Cục bông hồng ở gốc chùm lông
  sprite(ctx, POM, x, y, night ? '#b27a84' : '#f7b3c2', night)
  ctx.fillStyle = night ? 'rgba(255,240,240,.35)' : '#fff4f6'
  ctx.fillRect(Math.round(x * 2) / 2 - 1, Math.round(y * 2) / 2 - 1.5, 1, 0.5)
}

// Hình pixel nhỏ, mỗi ô 1px gốc, căn giữa tại (x, y), viền nửa px quanh mọi ô
const STAR = ['0001000', '0011100', '1111111', '0111110', '0011100', '0110110', '0100010']
const BELL = ['010', '111', '111']
const POM = ['01110', '11111', '11111', '11111', '01110']
function sprite(ctx: CanvasRenderingContext2D, rows: string[], x: number, y: number, fill: string, night: boolean) {
  const ox = Math.round((x - rows[0].length / 2) * 2) / 2
  const oy = Math.round((y - rows.length / 2) * 2) / 2
  for (const pass of [0, 1]) {
    ctx.fillStyle = pass ? fill : night ? OUTLINE_NIGHT : OUTLINE
    rows.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) {
        if (row[i] === '0') continue
        if (pass) ctx.fillRect(ox + i, oy + j, 1, 1)
        else ctx.fillRect(ox + i - 0.5, oy + j - 0.5, 2, 2)
      }
    })
  }
}

// Nét pixel theo lưới 0,5px gốc (= 1px canvas đệm)
function line(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, color: string, size = 0.5) {
  ctx.fillStyle = color
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2))
  for (let i = 0; i <= n; i++) {
    ctx.fillRect(Math.round((x0 + ((x1 - x0) * i) / n) * 2) / 2, Math.round((y0 + ((y1 - y0) * i) / n) * 2) / 2, size, size)
  }
}
