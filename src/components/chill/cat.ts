// Mèo mướp nằm trên bậu cửa trang /chill.
//
// Sprite AI (Nano Banana 2 qua Figma Weave), gom chung 1 atlas public/chill/cat.webp.
// Toạ độ theo px của atlas (×2 so với px gốc 640×360): [x, y, rộng, cao, ax] — ax là
// khoảng từ mép trái khung tới chân sau (mốc cố định trên bậu cửa), nên khung
// nào cũng đặt đúng chỗ dù rộng hẹp khác nhau. Khung ngồi (paw-*) căn giữa thân.

export const CAT_SRC = '/chill/cat.webp'
// Atlas vẽ ×2 so với px gốc (canvas 640×360) → nét gấp đôi trên canvas đệm 1280×720
const ATLAS_SCALE = 2

const FRAMES = {
  sleep: [0, 76, 168, 92, 13],
  stir: [172, 54, 165, 114, 9],
  tail: [341, 72, 178, 96, 28],
  look: [523, 54, 164, 114, 9],
  'stretch-0': [691, 67, 183, 101, 50],
  'stretch-1': [878, 0, 168, 168, 8],
  'stretch-2': [1050, 0, 158, 168, 8],
  'stretch-3': [1212, 43, 172, 125, 41],
  'groom-0': [1388, 54, 145, 114, 8],
  'groom-1': [1537, 51, 134, 117, 9],
  'groom-2': [1675, 56, 133, 112, 8],
  'groom-3': [1812, 50, 136, 118, 8],
  'groom-4': [1952, 56, 127, 112, 9],
  'groom-5': [2083, 56, 148, 112, 9],
  'paw-0': [2235, 15, 111, 153, -32],
  'paw-1': [2350, 15, 122, 153, -37],
  'paw-2': [2476, 12, 131, 156, -37],
  'paw-3': [2611, 17, 117, 151, -35],
  'paw-4': [2732, 3, 133, 165, -37],
  'paw-5': [2869, 15, 111, 153, -32],
} satisfies Record<string, [number, number, number, number, number]>

type Frame = keyof typeof FRAMES
type Step = [Frame, number] // khung, số giây

// Chân sau của mèo (px gốc 640×360) — mỗi theme đặt mèo một chỗ (xem themes.ts)
type Pt = {x: number; y: number}

export type CatAction = 'tail' | 'stir' | 'look' | 'stretch' | 'groom' | 'paw' | 'pet'

const repeat = (steps: Step[], n: number) => Array.from({length: n}, () => steps).flat()

const SEQUENCES: Record<CatAction, () => Step[]> = {
  tail: () => [['tail', 0.35 + Math.random() * 0.3]],
  stir: () => [['stir', 1.5 + Math.random()]],
  look: () => [['look', 3 + Math.random() * 4]],
  // Vươn vai: chổm dậy → vươn dài → ngáp → đứng → nằm lại
  stretch: () => [
    ['stir', 0.5],
    ['stretch-0', 0.5],
    ['stretch-1', 0.9],
    ['stretch-2', 1.3],
    ['stretch-1', 0.4],
    ['stretch-3', 0.8],
    ['look', 0.6],
  ],
  // Liếm chân rửa mặt: vài vòng liếm → lau mặt
  groom: () => [
    ['groom-0', 0.6],
    ...repeat(
      [
        ['groom-1', 0.3],
        ['groom-2', 0.35],
        ['groom-3', 0.45],
        ['groom-4', 0.35],
        ['groom-2', 0.3],
      ],
      2 + Math.floor(Math.random() * 2),
    ),
    ['groom-5', 0.6],
    ['look', 0.8],
  ],
  // Ngồi dậy khều giọt mưa trên kính
  paw: () => [
    ['look', 0.5],
    ['paw-0', 0.8],
    ['paw-1', 0.25],
    ['paw-2', 0.4],
    ['paw-3', 0.6],
    ['paw-1', 0.2],
    ['paw-4', 0.4],
    ['paw-3', 0.5],
    ['paw-5', 1],
    ['look', 0.8],
  ],
  // Được vuốt ve: ngẩng lên nhìn, tim bay lên
  pet: () => [
    ['stir', 0.25],
    ['look', 2.2],
  ],
}

type Heart = {x: number; y: number; age: number; drift: number}

export class Cat {
  private queue: Step[] = []
  private frame: Frame = 'sleep'
  private hold = 0
  private next = 5
  private breath = 0
  private hearts: Heart[] = []
  private pets = 0
  action: CatAction | null = null
  private rear: Pt = {x: 112, y: 296}

  setRear(p: Pt) {
    this.rear = p
    this.hearts = []
  }

  // Vùng bấm được (px gốc) — phủ cả tư thế nằm lẫn ngồi
  get hitBox() {
    return {x: this.rear.x - 6, y: this.rear.y - 70, w: 96, h: 74}
  }

  // Đầu ngón chân khi khều (khung paw-2 / paw-4) → chỗ đặt giọt mưa trên kính
  get pawTip() {
    return {x: this.rear.x + 62, y: this.rear.y - 77}
  }
  // Đang giơ chân khều (để cảnh đặt giọt mưa đúng chỗ)
  get pawing() {
    return this.frame === 'paw-2' || this.frame === 'paw-4'
  }

  update(dt: number, mood: {night: boolean; rain: boolean; music: boolean}) {
    this.breath += dt
    for (const h of this.hearts) {
      h.age += dt
      h.y -= dt * 9
      h.x += Math.sin(h.age * 3 + h.drift) * dt * 5
    }
    this.hearts = this.hearts.filter((h) => h.age < 1.8)

    if (this.hold > 0) {
      this.hold -= dt
      if (this.hold > 0) return
    }
    const step = this.queue.shift()
    if (step) {
      ;[this.frame, this.hold] = step
      return
    }
    this.frame = 'sleep'
    this.action = null
    this.next -= dt
    if (this.next > 0) return
    this.play(this.pick(mood))
    this.next = (mood.music ? 4 : 7) + Math.random() * 8
  }

  // Chọn hành động ngẫu nhiên theo không khí: đêm ngủ say, mưa hay ngồi khều
  // giọt nước, bật nhạc thì vẫy đuôi nhiều hơn
  private pick({night, rain, music}: {night: boolean; rain: boolean; music: boolean}): CatAction {
    const weights: [CatAction, number][] = [
      ['tail', music ? 4 : 2.5],
      ['stir', 1],
      ['look', night ? 0 : rain ? 1.5 : 1.2],
      ['groom', night ? 0.6 : 1.4],
      ['stretch', night ? 0.4 : 1],
      ['paw', rain && !night ? 2 : 0],
    ]
    let r = Math.random() * weights.reduce((s, [, w]) => s + w, 0)
    for (const [a, w] of weights) if ((r -= w) < 0) return a
    return 'tail'
  }

  play(action: CatAction) {
    this.action = action
    this.queue = SEQUENCES[action]()
    this.hold = 0
  }

  // Chuột lướt qua lúc đang ngủ → hé mắt nhìn (gợi ý là bấm vào được)
  notice() {
    if (this.action) return
    this.action = 'look'
    this.queue = [
      ['stir', 0.2],
      ['look', 1.6],
    ]
    this.hold = 0
  }

  // Người xem bấm vào mèo: ngẩng lên + tim; bấm lần thứ 3 thì vươn vai
  pet(): 'meow' | 'purr' {
    this.pets++
    const stretch = this.pets % 3 === 0
    this.play(stretch ? 'stretch' : 'pet')
    this.next = 6
    for (let i = 0; i < 3; i++) {
      this.hearts.push({x: this.rear.x + 52 + (i - 1) * 12, y: this.rear.y - 66 - i * 6, age: -i * 0.18, drift: i * 2})
    }
    return this.pets % 2 ? 'meow' : 'purr'
  }

  // Vẽ theo px gốc 640×360 (ctx đã scale RES)
  draw(ctx: CanvasRenderingContext2D, atlas: HTMLCanvasElement) {
    if (!atlas.width) return
    const [sx, sy, sw, sh, ax] = FRAMES[this.frame]
    const w = sw / ATLAS_SCALE
    const h = sh / ATLAS_SCALE
    const x = this.rear.x - ax / ATLAS_SCALE
    const sitting = this.frame.startsWith('paw') || this.frame === 'stretch-3'
    // Bóng mềm dưới thân
    ctx.fillStyle = 'rgba(40,20,10,0.22)'
    const bx = sitting ? x + 8 : this.rear.x - 2
    const bw = sitting ? w - 16 : 76
    ctx.fillRect(bx, this.rear.y - 2, bw, 2)
    ctx.fillRect(bx + 6, this.rear.y, bw - 12, 2)
    // Thở: lưng phồng lên 1px rồi xẹp xuống (~3.5s/nhịp) khi đang nằm ngủ
    const inhale = this.frame === 'sleep' && this.breath % 3.5 < 1.6 ? 0.5 : 0
    ctx.drawImage(atlas, sx, sy, sw, sh, x, this.rear.y - h - inhale, w, h + inhale)
    this.drawHearts(ctx)
  }

  // Tim pixel 7×6 ô (mỗi ô 2px) bay lên, mờ dần
  private drawHearts(ctx: CanvasRenderingContext2D) {
    const rows = ['0110110', '1111111', '1111111', '0111110', '0011100', '0001000']
    for (const h of this.hearts) {
      if (h.age < 0) continue
      const a = Math.min(1, h.age * 4) * Math.max(0, 1 - h.age / 1.8)
      const x = Math.round(h.x)
      const y = Math.round(h.y)
      rows.forEach((row, j) => {
        for (let i = 0; i < row.length; i++) {
          if (row[i] === '0') continue
          ctx.fillStyle = j === 1 && i === 1 ? `rgba(255,220,225,${a})` : `rgba(240,90,110,${a})`
          ctx.fillRect(x + i * 2, y + j * 2, 2, 2)
        }
      })
    }
  }
}
