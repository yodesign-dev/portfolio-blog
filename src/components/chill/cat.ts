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

// shine / notes / purr chỉ diễn khi người xem chạm vào mèo (xem pet + setPurring)
export type CatAction = 'tail' | 'stir' | 'look' | 'stretch' | 'groom' | 'paw' | 'pet' | 'shine' | 'notes' | 'purr'
type Mood = {night: boolean; rain: boolean; music: boolean}

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
  // Chạm → rửa mặt làm dáng: liếm 1 vòng, lau mặt, rồi ngẩng lên lấp lánh
  shine: () => [
    ['groom-0', 0.4],
    ['groom-1', 0.3],
    ['groom-2', 0.35],
    ['groom-3', 0.45],
    ['groom-4', 0.35],
    ['groom-5', 0.7],
    ['look', 1.4],
  ],
  // Chạm lúc đang phát nhạc → ngồi dậy khều mấy nốt nhạc bay quanh
  notes: () => [
    ['stir', 0.2],
    ['paw-0', 0.5],
    ['paw-1', 0.2],
    ['paw-2', 0.4],
    ['paw-3', 0.35],
    ['paw-1', 0.2],
    ['paw-4', 0.4],
    ['paw-3', 0.3],
    ['paw-1', 0.2],
    ['paw-2', 0.4],
    ['paw-5', 0.6],
    ['look', 0.6],
  ],
  // Nhấn giữ → gừ gừ: không theo chuỗi khung, xem setPurring
  purr: () => [],
}
// Lúc bắt đầu lau mặt trong chuỗi `shine` (giây) — tia lấp lánh bung ra từ đây
const SHINE_AT = 1.85
// Phản ứng khi chạm: [hành động, trọng số lúc im lặng, lúc có nhạc, ban đêm nhân thêm]
const TAP_REACTIONS: [CatAction, number, number, number][] = [
  ['pet', 2, 1.5, 1],
  ['shine', 2, 1.5, 0.7],
  ['stretch', 1, 1, 2],
  ['notes', 0, 3, 1],
]

type Heart = {x: number; y: number; age: number; drift: number}
// Nốt nhạc mèo vờn: rơi chậm quanh tầm chân, bị khều trúng thì nảy lên rồi tan
type CatNote = {x: number; y: number; vx: number; vy: number; age: number; hit: boolean}
type Spark = {x: number; y: number; age: number; big: boolean}

export class Cat {
  private queue: Step[] = []
  private frame: Frame = 'sleep'
  private hold = 0
  private next = 5
  private breath = 0
  private hearts: Heart[] = []
  private notes: CatNote[] = []
  private sparks: Spark[] = []
  private pets = 0
  private lastTap: CatAction | null = null
  private mood: Mood = {night: false, rain: false, music: false}
  private purring = false
  private purrT = 0
  action: CatAction | null = null
  private rear: Pt = {x: 112, y: 296}

  setRear(p: Pt) {
    this.rear = p
    this.hearts = []
    this.notes = []
    this.sparks = []
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

  update(dt: number, mood: Mood) {
    this.mood = mood
    this.breath += dt
    for (const h of this.hearts) {
      h.age += dt
      h.y -= dt * 9
      h.x += Math.sin(h.age * 3 + h.drift) * dt * 5
    }
    this.hearts = this.hearts.filter((h) => h.age < 1.8)
    this.updateNotes(dt)
    for (const s of this.sparks) s.age += dt
    this.sparks = this.sparks.filter((s) => s.age < 0.9)

    // Đang được giữ tay: nằm lim dim, tim bay đều tới khi thả ra
    if (this.purring) {
      const before = Math.floor(this.purrT / 0.45)
      this.purrT += dt
      if (Math.floor(this.purrT / 0.45) > before) this.addHeart(Math.floor(this.purrT / 0.45) % 3)
      return
    }

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
  private pick({night, rain, music}: Mood): CatAction {
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

  // Người xem bấm vào mèo: mỗi lần một phản ứng — ngẩng lên nhìn, rửa mặt làm dáng, vươn vai
  // ngáp, hoặc (đang phát nhạc) ngồi dậy vờn nốt nhạc. Chọn theo không khí, không lặp lại
  // phản ứng vừa diễn. Tim bay lên ở mọi phản ứng
  pet(): 'meow' | 'purr' {
    this.pets++
    const {music, night} = this.mood
    const options = TAP_REACTIONS.map(([a, quiet, withMusic, atNight]) => [a, a === this.lastTap ? 0 : (music ? withMusic : quiet) * (night ? atNight : 1)] as const)
    let r = Math.random() * options.reduce((s, [, w]) => s + w, 0)
    const action = options.find(([, w]) => (r -= w) < 0)?.[0] ?? 'pet'
    this.lastTap = action
    this.play(action)
    this.next = 6
    for (let i = 0; i < 3; i++) this.addHeart(i, -i * 0.18)
    if (action === 'shine') {
      // Vài tia nhỏ lúc đang liếm, rồi bung quanh đầu lúc lau mặt xong
      const head = {x: this.rear.x + 58, y: this.rear.y - 46}
      const spots: [number, number, number, boolean][] = [
        [-6, -4, 0.5, false],
        [14, 6, 1.1, false],
        [-14, -16, SHINE_AT, true],
        [12, -22, SHINE_AT + 0.15, false],
        [26, -6, SHINE_AT + 0.3, true],
        [-4, -30, SHINE_AT + 0.5, false],
        [20, -30, SHINE_AT + 0.7, true],
      ]
      for (const [dx, dy, at, big] of spots) this.sparks.push({x: head.x + dx, y: head.y + dy, age: -at, big})
    }
    if (action === 'notes') {
      // 3 nốt thả xuống quanh tầm chân, lệch giờ để mỗi lần khều trúng 1 nốt
      const tip = this.pawTip
      for (let i = 0; i < 3; i++) {
        this.notes.push({x: tip.x - 10 + i * 9, y: tip.y - 26 - i * 4, vx: 0, vy: 9, age: -0.5 - i * 0.75, hit: false})
      }
    }
    return this.pets % 2 ? 'meow' : 'purr'
  }

  // Nhấn giữ vào mèo → gừ gừ (ChillRoom phát tiếng), thả ra thì ngẩng lên nhìn
  setPurring(on: boolean) {
    if (on === this.purring) return
    this.purring = on
    this.purrT = 0
    this.hold = 0
    if (on) {
      this.action = 'purr'
      this.queue = []
      this.frame = 'stir'
      this.addHeart(1)
    } else {
      this.action = 'pet'
      this.queue = [['look', 1.4]]
      this.next = 6
    }
  }

  private addHeart(i: number, age = 0) {
    this.hearts.push({x: this.rear.x + 52 + (i - 1) * 12, y: this.rear.y - 66 - i * 6, age, drift: i * 2})
  }

  private updateNotes(dt: number) {
    const tip = this.pawTip
    for (const n of this.notes) {
      n.age += dt
      if (n.age < 0) continue
      n.x += n.vx * dt
      n.y += n.vy * dt
      if (n.hit) n.vy += 60 * dt
      // Chân đang giơ lên mà nốt nằm trong tầm → khều trúng: nốt nảy lên, toé 1 tia
      else if (this.pawing && this.action === 'notes' && Math.abs(n.x - tip.x) < 14 && Math.abs(n.y - tip.y) < 16) {
        n.hit = true
        n.vy = -34
        n.vx = n.x < tip.x ? -16 : 16
        n.age = Math.max(n.age, 2)
        this.sparks.push({x: n.x, y: n.y, age: 0, big: false})
      }
    }
    this.notes = this.notes.filter((n) => n.age < 3)
  }

  // Vẽ theo px gốc 640×360 (ctx đã scale RES)
  draw(ctx: CanvasRenderingContext2D, atlas: HTMLCanvasElement) {
    if (!atlas.width) return
    const [sx, sy, sw, sh, ax] = FRAMES[this.frame]
    const w = sw / ATLAS_SCALE
    const h = sh / ATLAS_SCALE
    // Gừ gừ: cả thân rung nửa px qua lại
    const x = this.rear.x - ax / ATLAS_SCALE + (this.purring ? (Math.floor(this.purrT * 24) % 2 ? 0.5 : -0.5) : 0)
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
    this.drawNotes(ctx)
    this.drawSparks(ctx)
  }

  // Nốt móc đơn (ô 2px, cùng dáng nốt bay ra từ tai nghe), khều trúng thì ngả màu hổ phách
  private drawNotes(ctx: CanvasRenderingContext2D) {
    for (const n of this.notes) {
      if (n.age < 0) continue
      const a = Math.min(1, n.age * 4) * Math.max(0, 1 - Math.max(0, n.age - 2))
      ctx.fillStyle = n.hit ? `rgba(240,180,110,${a})` : `rgba(255,236,200,${a})`
      const x = Math.round(n.x)
      const y = Math.round(n.y)
      ctx.fillRect(x, y + 6, 4, 4)
      ctx.fillRect(x + 2, y, 2, 8)
      ctx.fillRect(x + 4, y, 2, 2)
      ctx.fillRect(x + 6, y + 2, 2, 2)
    }
  }

  // Tia lấp lánh 4 cánh: loé lên rồi thu lại
  private drawSparks(ctx: CanvasRenderingContext2D) {
    for (const s of this.sparks) {
      if (s.age < 0) continue
      const k = Math.sin(Math.min(1, s.age / 0.9) * Math.PI)
      const arm = Math.round((s.big ? 6 : 4) * k)
      if (arm < 1) continue
      const x = Math.round(s.x)
      const y = Math.round(s.y)
      ctx.fillStyle = `rgba(255,244,214,${(0.35 + 0.65 * k).toFixed(2)})`
      ctx.fillRect(x - arm, y, arm * 2 + 2, 2)
      ctx.fillRect(x, y - arm, 2, arm * 2 + 2)
    }
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
