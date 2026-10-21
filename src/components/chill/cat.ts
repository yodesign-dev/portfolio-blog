// Mèo mướp nằm trên bậu cửa trang /chill.
//
// Sprite AI (Nano Banana 2 qua Figma Weave), gom chung 1 atlas public/chill/cat.webp.
// Toạ độ theo px của atlas (×2 so với px gốc 640×360): [x, y, rộng, cao, ax] — ax là
// khoảng từ mép trái khung tới chân sau (mốc cố định trên bậu cửa), nên khung
// nào cũng đặt đúng chỗ dù rộng hẹp khác nhau. Khung ngồi (paw-*) căn giữa thân.
//
// Trêu bằng cần câu lông vũ (wand.ts, sau công tắc Studio catToyOpen): mèo săn như mèo
// thật — dõi theo → lông vũ trên đầu thì ngồi khều, nằm im trên bậu thì rình + lắc mông
// → vồ → ôm hoặc hụt. Giấu xuống dưới bậu rồi ló ra thì hăng hơn, vẫy loạn thì chán quay
// lưng, vồ chừng 7 lần là hết sức, đi ngủ. Khung riêng ở hàng thứ hai của atlas: rình
// (stalk-*), lắc mông (wiggle-*), vồ (pounce-*), ôm lông vũ (hug-*), dõi theo (head-*).

import type {Wand} from './wand'

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
  // Hàng 2 — trò cần câu. ax đặt đầu mèo thẳng hàng với khung look (vồ: tính theo mũi)
  'stalk-0': [0, 342, 158, 84, 3],
  'stalk-1': [162, 310, 164, 116, 9],
  'wiggle-0': [330, 244, 120, 182, -35],
  'wiggle-1': [454, 237, 125, 189, -30],
  'wiggle-2': [583, 247, 124, 179, -31],
  'pounce-0': [711, 172, 219, 254, 27],
  'pounce-1': [934, 230, 297, 196, 95],
  'pounce-2': [1235, 230, 203, 196, 48],
  'pounce-3': [1442, 293, 199, 133, 44],
  'hug-0': [1645, 285, 256, 141, 101],
  'hug-1': [1905, 252, 249, 174, 94],
  'head-0': [2158, 302, 155, 124, 0],
  'head-1': [2317, 307, 183, 119, 28],
  'head-2': [2504, 296, 168, 130, 13],
} satisfies Record<string, [number, number, number, number, number]>

type Frame = keyof typeof FRAMES
type Step = [Frame, number] // khung, số giây
// Trạng thái lúc có cần câu ('off' = không chơi, mèo sống theo nhịp thường)
type Hunt = 'off' | 'sleep' | 'watch' | 'sit' | 'stalk' | 'pounce' | 'catch' | 'miss' | 'ignore' | 'turn' | 'tired' | 'home'
export type ToyEvent = 'bat' | 'catch' | 'miss' | 'tired'
// Khung ôm: lông vũ kẹp giữa hai chân trước, chỗ này (px gốc từ chân sau, cao trên bậu)
const HUG_AT: Partial<Record<Frame, [number, number]>> = {'hug-0': [25, 27], 'hug-1': [25, 75]}
// Thân mèo nằm dài chừng này (px gốc): quay đầu thì chân sau đổi sang mút bên kia
const BODY = 76
// Sức chơi: mỗi cú vồ / ôm / khều tốn một ít, xuống tới mức này thì mèo đi ngủ
const TIRED_AT = 18

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
type Jump = {x0: number; x1: number; t: number; dur: number; hgt: number; land: () => void}

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
  // Chỗ nằm quen (chân sau, quay mặt sang phải) + khoảng bậu được đi lại khi chơi
  private rear: Pt = {x: 112, y: 296}
  private room: [number, number] = [0, 640]
  // Vị trí chân sau hiện tại + hướng mặt (1 = phải) — chỉ đổi khi đang chơi cần câu
  private x = 112
  private dir: 1 | -1 = 1
  private lift = 0
  private then: (() => void) | null = null
  private jump: Jump | null = null
  // Cần câu
  private toy: Wand | null = null
  private hunt: Hunt = 'off'
  private huntT = 0
  private energy = 100
  private excite = 0
  private bored = 0
  private hidT = 0
  private stillT = 0
  private wakeT = 0
  private farT = 0
  private outT = 0
  private cool = 0
  private wiggle = 1
  private batDone = false
  onToy?: (e: ToyEvent) => void

  setRear(p: Pt, room: [number, number] = [p.x - 40, p.x + BODY + 40]) {
    this.rear = p
    this.room = room
    this.x = p.x
    this.dir = 1
    this.lift = 0
    this.jump = null
    this.toy = null
    this.hunt = 'off'
    this.queue = []
    this.then = null
    this.hold = 0
    this.hearts = []
    this.notes = []
    this.sparks = []
  }

  // Điểm cách chân sau `dx` px về phía mèo đang nhìn
  private at(dx: number) {
    return this.x + this.dir * dx
  }

  // Vùng bấm được (px gốc) — phủ cả tư thế nằm lẫn ngồi
  get hitBox() {
    return {x: this.rear.x - 6, y: this.rear.y - 70, w: 96, h: 74}
  }

  // Đầu ngón chân khi khều (khung paw-2 / paw-4) → chỗ đặt giọt mưa trên kính
  get pawTip() {
    return {x: this.at(62), y: this.rear.y - 77}
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

    if (this.toy) this.track(dt)
    else if (this.hunt === 'off') this.energy = Math.min(100, this.energy + dt * 5)

    // Đang được giữ tay: nằm lim dim, tim bay đều tới khi thả ra
    if (this.purring) {
      const before = Math.floor(this.purrT / 0.45)
      this.purrT += dt
      if (Math.floor(this.purrT / 0.45) > before) this.addHeart(Math.floor(this.purrT / 0.45) % 3)
      return
    }

    if (this.jump) return this.updateJump(dt)
    if (this.hunt === 'catch' && this.toy && this.queue.length < 4) {
      // Đang ngậm mà người xem giật mạnh → nhả ra
      const m = this.mouth
      if (Math.hypot(this.toy.hand.x - m.x, this.toy.hand.y - m.y) > 95) {
        this.queue = []
        this.hold = 0
      }
    }
    if (this.hold > 0) {
      this.hold -= dt
      if (this.toy) this.checkBat()
      if (this.hold > 0) return
    }
    const step = this.queue.shift()
    if (step) {
      ;[this.frame, this.hold] = step
      return
    }
    if (this.then) {
      const then = this.then
      this.then = null
      then()
      if (this.queue.length || this.jump || this.hunt !== 'off') return
    }
    if (this.hunt !== 'off') return this.updateHunt(dt)
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
    if (this.action || this.hunt !== 'off') return
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
      const head = {x: this.at(58), y: this.rear.y - 46}
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
    if (on === this.purring || (on && this.hunt !== 'off')) return
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

  // ---------- Cần câu lông vũ ----------

  private get head() {
    return {x: this.at(60), y: this.rear.y - 30 - this.lift}
  }
  private get mouth() {
    const [dx, up] = HUG_AT[this.frame] ?? [54, 24]
    return {x: this.at(dx), y: this.rear.y - up}
  }

  // Người xem lấy cần câu ra (mèo bắt đầu để ý) / cất đi (mèo về chỗ nằm quen)
  setToy(toy: Wand | null) {
    if (toy) {
      if (this.toy === toy) return
      this.toy = toy
      this.purring = false
      this.action = null
      if (this.hunt === 'off') {
        this.queue = []
        this.hold = 0
        this.then = null
        this.enter('sleep')
      }
      return
    }
    if (this.toy) this.toy.pin = null
    this.toy = null
    if (this.hunt === 'off' || this.hunt === 'tired' || this.hunt === 'home' || this.jump) return
    this.goHome()
  }

  private run(steps: Step[], then?: () => void) {
    this.queue = steps
    this.hold = 0
    this.then = then ?? null
  }

  private enter(hunt: Hunt) {
    this.hunt = hunt
    this.huntT = 0
    this.stillT = 0
    this.wakeT = 0
    this.farT = 0
    this.outT = 0
    // Càng hăng càng lắc mông ngắn
    if (hunt === 'stalk') this.wiggle = (1.3 - this.excite * 0.8) * (0.8 + Math.random() * 0.4)
  }

  // Quay đầu tại chỗ: thân giữ nguyên, chân sau đổi sang mút bên kia
  private flip() {
    this.x += this.dir * BODY
    this.dir = this.dir === 1 ? -1 : 1
  }

  // Theo dõi lông vũ mỗi frame: chán khi bị vẫy loạn, hăng lên khi mồi trốn rồi ló ra
  private track(dt: number) {
    const toy = this.toy!
    toy.pin = this.hunt === 'catch' ? this.mouth : null
    const h = this.head
    const awake = this.hunt === 'watch' || this.hunt === 'sit' || this.hunt === 'stalk'
    if (awake && !toy.hidden && toy.speed > 280 && Math.hypot(toy.x - h.x, toy.y - h.y) < 200) this.bored += dt
    else this.bored = Math.max(0, this.bored - dt * 0.8)
    if (toy.hidden) this.hidT += dt
    else {
      if (this.hidT > 0.6 && awake) this.excite = Math.min(1, this.excite + 0.5)
      this.hidT = 0
    }
    this.excite = Math.max(0, this.excite - dt * 0.04)
  }

  private updateHunt(dt: number) {
    const toy = this.toy
    if (!toy) return this.goHome()
    this.huntT += dt
    const h = this.head
    const dist = Math.hypot(toy.x - h.x, toy.y - h.y)
    // dx > 0: lông vũ ở phía trước mặt · dy < 0: cao hơn mặt bậu
    const dx = (toy.x - h.x) * this.dir
    const dy = toy.y - this.rear.y
    switch (this.hunt) {
      case 'sleep':
        this.frame = 'sleep'
        if (!toy.hidden && dist < 180 && toy.speed > 20) {
          this.wakeT += dt
          if (this.wakeT > 0.3) {
            this.run([['stir', 0.35]], () => {
              if (this.toy && (this.toy.x - this.head.x) * this.dir < -16) this.flip()
              this.enter('watch')
            })
          }
        } else this.wakeT = Math.max(0, this.wakeT - dt)
        return
      case 'watch':
        // Ngước lên khi lông vũ ở cao, nhìn thẳng ra khi nó sát mặt, chếch ra khi ở xa
        this.frame = dy < -50 ? 'head-2' : dx < 30 ? 'head-1' : dx > 120 ? 'head-0' : 'look'
        if (this.bored > 2.2) return this.goIgnore()
        if (toy.hidden) {
          if (this.hidT > 5) this.doze()
          return
        }
        if (dx < -16) return this.turn()
        if (dist > 230) {
          this.farT += dt
          if (this.farT > 4) this.doze()
          return
        }
        this.farT = 0
        // Lơ lửng trên đầu → ngồi dậy khều
        if (dy < -38 && dy > -115 && dx < 85) return this.run([['paw-0', 0.15]], () => this.enter('sit'))
        // Nằm im trên bậu trước mặt → rình. Đang hăng mà mồi vụt chạy → vồ luôn
        if (dy > -24 && dx > 12 && dx < 200) {
          this.stillT = toy.speed < 40 ? this.stillT + dt : 0
          if (this.stillT > 0.3) return this.enter('stalk')
          if (this.excite > 0.6 && toy.speed > 150 && dx < 130) return this.pounce()
        } else this.stillT = 0
        return
      case 'sit': {
        this.frame = 'paw-0'
        this.cool -= dt
        const out = toy.hidden || dy > -30 || dx > 100 || dx < -20
        this.outT = out ? this.outT + dt : 0
        if (this.outT > 0.45) return this.run([['paw-5', 0.25]], () => this.enter('watch'))
        if (this.bored > 2.2) return this.goIgnore()
        const tip = this.pawTip
        if (this.cool <= 0 && Math.hypot(toy.x - tip.x, toy.y - tip.y) < 32) this.bat()
        return
      }
      case 'stalk': {
        if (toy.hidden || dy < -40 || dx < 0 || dx > 210) return this.enter('watch')
        // Cúp người sát bậu → nhổm mông → lắc qua lắc lại
        const wig = this.huntT > 0.35 && this.huntT < 0.35 + this.wiggle
        if (!wig) this.frame = this.huntT < 0.2 ? 'stalk-0' : 'stalk-1'
        else this.frame = Math.floor(this.huntT * 8) % 2 ? 'wiggle-1' : 'wiggle-0'
        // Mồi vụt chạy giữa lúc rình, hoặc lắc mông xong → vồ
        if ((this.huntT > 0.2 && toy.speed > 110) || this.huntT >= 0.35 + this.wiggle) this.pounce()
        return
      }
    }
  }

  private doze() {
    this.run([['stir', 0.3]], () => this.enter('sleep'))
  }

  private turn() {
    this.hunt = 'turn'
    this.run([['stir', 0.15]], () => {
      this.flip()
      this.enter('watch')
    })
  }

  // Bị vẫy loạn sát mặt → quay lưng nằm một lúc rồi mới quay lại
  private goIgnore() {
    this.hunt = 'ignore'
    this.flip()
    this.run(
      [
        ['stir', 0.2],
        ['sleep', 2.6],
        ['stir', 0.3],
      ],
      () => {
        this.bored = 0
        this.excite = 0
        this.flip()
        this.enter('watch')
      },
    )
  }

  private bat() {
    this.batDone = false
    this.energy -= 3
    const up: Frame = Math.random() < 0.5 ? 'paw-2' : 'paw-4'
    this.run(
      [
        ['paw-1', 0.08],
        [up, up === 'paw-2' ? 0.22 : 0.24],
        ['paw-3', 0.16],
      ],
      () => {
        this.cool = 0.2 + Math.random() * 0.3
        if (this.energy <= TIRED_AT) this.goTired()
      },
    )
  }

  // Chân đang giơ cao mà lông vũ trong tầm → khều trúng, hất lông vũ lên
  private checkBat() {
    const toy = this.toy
    if (!toy || this.batDone || !this.pawing) return
    const tip = this.pawTip
    if (Math.hypot(toy.x - tip.x, toy.y - tip.y) > 20) return
    this.batDone = true
    toy.kick(this.dir * 3.4, -3.6)
    this.excite = Math.min(1, this.excite + 0.1)
    this.sparks.push({x: toy.x, y: toy.y, age: 0, big: true})
    this.onToy?.('bat')
  }

  private pounce() {
    const toy = this.toy!
    const h = this.head
    // Nhắm hơi trước chỗ lông vũ đang chạy tới, trong khoảng bậu được đi lại
    const reach = Math.max(8, Math.min(170, (toy.x + toy.vx * 0.18 - h.x) * this.dir))
    let x1 = h.x + this.dir * (reach - 60)
    const [lo, hi] = this.room
    const left = Math.min(x1, x1 + this.dir * BODY)
    const right = Math.max(x1, x1 + this.dir * BODY)
    if (left < lo) x1 += lo - left
    if (right > hi) x1 -= right - hi
    this.energy -= 9
    this.excite *= 0.5
    this.hunt = 'pounce'
    this.leap(x1, () => this.land(), true)
  }

  private leap(x1: number, land: () => void, crouch = false) {
    const d = Math.abs(x1 - this.x)
    this.jump = {x0: this.x, x1, t: crouch ? -0.09 : 0, dur: 0.28 + d / 650, hgt: 8 + d * 0.12, land}
    this.frame = crouch ? 'wiggle-2' : 'stalk-1'
  }

  private updateJump(dt: number) {
    const j = this.jump!
    j.t += dt
    if (j.t < 0) return
    const k = Math.min(1, j.t / j.dur)
    this.x = j.x0 + (j.x1 - j.x0) * (1 - (1 - k) * (1 - k))
    this.lift = Math.sin(k * Math.PI) * j.hgt
    this.frame = k < 0.2 ? 'pounce-0' : k < 0.6 ? 'pounce-1' : k < 0.88 ? 'pounce-2' : 'pounce-3'
    if (k < 1) return
    this.lift = 0
    this.jump = null
    j.land()
  }

  private land() {
    const toy = this.toy
    const m = this.mouth
    if (toy && !toy.hidden && Math.hypot(toy.x - m.x, toy.y - m.y) < 24) {
      this.hunt = 'catch'
      this.energy -= 6
      for (let i = 0; i < 3; i++) this.addHeart(i, -i * 0.18)
      this.onToy?.('catch')
      this.run(
        [
          ['pounce-3', 0.08],
          ['hug-0', 0.9],
          ['hug-1', 0.45],
          ['hug-0', 0.5],
          ['hug-1', 0.35],
          ['stir', 0.25],
        ],
        () => {
          // Nhả lông vũ ra, hất nhẹ về phía trước
          if (this.toy) {
            this.toy.pin = null
            this.toy.kick(this.dir * 2.5, -2)
          }
          this.after()
        },
      )
    } else {
      this.hunt = 'miss'
      this.onToy?.('miss')
      this.run(
        [
          ['pounce-3', 0.25],
          ['head-1', 0.4],
          ['look', 0.3],
        ],
        () => this.after(),
      )
    }
  }

  private after() {
    if (this.energy <= TIRED_AT) this.goTired()
    else this.enter('watch')
  }

  // Hết sức: nhả cần câu, vươn vai, rửa mặt rồi về chỗ nằm ngủ
  private goTired() {
    if (this.toy) this.toy.pin = null
    this.toy = null
    this.hunt = 'tired'
    this.onToy?.('tired')
    this.run(
      [
        ['look', 0.4],
        ['stretch-0', 0.5],
        ['stretch-1', 0.8],
        ['stretch-2', 1.2],
        ['stretch-1', 0.4],
        ['stretch-3', 0.6],
        ['groom-0', 0.4],
        ['groom-1', 0.3],
        ['groom-2', 0.35],
        ['groom-3', 0.4],
        ['groom-5', 0.5],
      ],
      () => this.goHome(),
    )
  }

  // Quay mặt lại như cũ rồi nhảy về chỗ nằm quen
  private goHome() {
    this.hunt = 'home'
    this.run([['stir', 0.3]], () => {
      if (this.dir !== 1) this.flip()
      if (Math.abs(this.x - this.rear.x) > 1) this.leap(this.rear.x, () => this.rest())
      else this.rest()
    })
  }

  private rest() {
    this.x = this.rear.x
    this.frame = 'sleep'
    this.next = 4
    if (this.toy) this.enter('sleep')
    else this.hunt = 'off'
  }

  private addHeart(i: number, age = 0) {
    this.hearts.push({x: this.at(52) + (i - 1) * 12, y: this.rear.y - 66 - i * 6 - this.lift, age, drift: i * 2})
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
    const shake = this.purring ? (Math.floor(this.purrT * 24) % 2 ? 0.5 : -0.5) : 0
    const rx = this.x + shake
    const sitting = this.frame.startsWith('paw') || this.frame === 'stretch-3'
    // Bóng mềm dưới thân (nhỏ lại khi đang nhảy)
    ctx.fillStyle = 'rgba(40,20,10,0.22)'
    const shrink = Math.max(0.3, 1 - this.lift / 40)
    const bw = (sitting ? w - 16 : BODY) * shrink
    const mid = sitting ? rx - this.dir * (ax / ATLAS_SCALE) + (this.dir * w) / 2 : this.at(BODY / 2 - 2)
    ctx.fillRect(mid - bw / 2, this.rear.y - 2, bw, 2)
    ctx.fillRect(mid - bw / 2 + 6, this.rear.y, Math.max(0, bw - 12), 2)
    // Thở: lưng phồng lên 1px rồi xẹp xuống (~3.5s/nhịp) khi đang nằm ngủ
    const inhale = this.frame === 'sleep' && this.breath % 3.5 < 1.6 ? 0.5 : 0
    const y = this.rear.y - h - inhale - this.lift
    if (this.dir === 1) ctx.drawImage(atlas, sx, sy, sw, sh, rx - ax / ATLAS_SCALE, y, w, h + inhale)
    else {
      // Quay sang trái: lật khung quanh chân sau
      ctx.save()
      ctx.translate(rx, 0)
      ctx.scale(-1, 1)
      ctx.drawImage(atlas, sx, sy, sw, sh, -ax / ATLAS_SCALE, y, w, h + inhale)
      ctx.restore()
    }
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
