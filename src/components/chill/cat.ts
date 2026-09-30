// Mèo mướp nằm trên bậu cửa trang /chill.
//
// Sprite AI (Nano Banana 2 qua Figma Weave), gom chung 1 atlas public/chill/cat.png.
// Toạ độ theo px thật trên canvas đệm 640×360: [x, y, rộng, cao, ax] — ax là
// khoảng từ mép trái khung tới chân sau (mốc cố định trên bậu cửa), nên khung
// nào cũng đặt đúng chỗ dù rộng hẹp khác nhau. Khung ngồi (paw-*) căn giữa thân.

export const CAT_SRC = '/chill/cat.png'

const FRAMES = {
  sleep: [0, 38, 85, 47, 8],
  stir: [87, 27, 83, 58, 8],
  tail: [172, 36, 90, 49, 19],
  look: [264, 27, 83, 58, 8],
  'stretch-0': [349, 34, 92, 51, 26],
  'stretch-1': [443, 0, 85, 85, 6],
  'stretch-2': [530, 0, 80, 85, 6],
  'stretch-3': [612, 21, 87, 64, 21],
  'groom-0': [701, 27, 73, 58, 8],
  'groom-1': [776, 25, 68, 60, 7],
  'groom-2': [846, 28, 67, 57, 8],
  'groom-3': [915, 25, 69, 60, 6],
  'groom-4': [986, 28, 64, 57, 8],
  'groom-5': [1052, 28, 75, 57, 8],
  'paw-0': [1129, 8, 56, 77, -16],
  'paw-1': [1187, 8, 61, 77, -19],
  'paw-2': [1250, 6, 67, 79, -18],
  'paw-3': [1319, 9, 60, 76, -17],
  'paw-4': [1381, 2, 67, 83, -18],
  'paw-5': [1450, 8, 56, 77, -16],
} satisfies Record<string, [number, number, number, number, number]>

type Frame = keyof typeof FRAMES
type Step = [Frame, number] // khung, số giây

// Chân sau của mèo trên bậu cửa (px thật trên canvas đệm)
const REAR = {x: 112, y: 296}
// Vùng bấm được (px thật) — phủ cả tư thế nằm lẫn ngồi
export const CAT_HIT = {x: REAR.x - 6, y: REAR.y - 70, w: 96, h: 74}
// Đầu ngón chân khi khều (khung paw-2 / paw-4) → chỗ đặt giọt mưa trên kính
export const CAT_PAW_TIP = {x: REAR.x + 62, y: REAR.y - 77}

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
      this.hearts.push({x: REAR.x + 52 + (i - 1) * 12, y: REAR.y - 66 - i * 6, age: -i * 0.18, drift: i * 2})
    }
    return this.pets % 2 ? 'meow' : 'purr'
  }

  // Vẽ theo px thật trên canvas đệm (ctx không scale)
  draw(ctx: CanvasRenderingContext2D, atlas: HTMLCanvasElement) {
    if (!atlas.width) return
    const [sx, sy, w, h, ax] = FRAMES[this.frame]
    const x = REAR.x - ax
    const sitting = this.frame.startsWith('paw') || this.frame === 'stretch-3'
    // Bóng mềm dưới thân
    ctx.fillStyle = 'rgba(40,20,10,0.22)'
    const bx = sitting ? x + 8 : REAR.x - 2
    const bw = sitting ? w - 16 : 76
    ctx.fillRect(bx, REAR.y - 2, bw, 2)
    ctx.fillRect(bx + 6, REAR.y, bw - 12, 2)
    // Thở: lưng phồng lên 1px rồi xẹp xuống (~3.5s/nhịp) khi đang nằm ngủ
    const inhale = this.frame === 'sleep' && this.breath % 3.5 < 1.6 ? 1 : 0
    ctx.drawImage(atlas, sx, sy, w, h, x, REAR.y - h - inhale, w, h + inhale)
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
