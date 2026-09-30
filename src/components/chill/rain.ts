// Mưa trang /chill — vẽ theo px thật trên canvas đệm 640×360 (ctx không scale).
//
// Ngoài kính: 3 lớp hạt mưa (xa: ngắn, mờ, dày · giữa · gần: vệt dài, sáng, rơi
// nhanh), gió lắc góc mưa theo từng đợt, mưa nặng hạt / dịu dần; hạt chạm đất
// bắn thành vương miện nhỏ, vũng nước gợn vòng, nước nhỏ giọt từ mái hiên.
// Trên kính: giọt nước đọng to dần, đủ nặng thì trượt xuống từng đoạn, nuốt các
// giọt trên đường đi và để lại vệt giọt li ti; giọt to khúc xạ ngược cảnh phía
// sau như thấu kính. Mép dưới kính đọng hơi nước. Thỉnh thoảng có chớp.

type Box = {x: number; y: number; w: number; h: number}
type Streak = {x: number; y: number; len: number; speed: number; ground: number}
type Layer = {streaks: Streak[]; len: [number, number]; speed: [number, number]; ground: [number, number] | null; alpha: number; width: number; splash: number}
type Splash = {x: number; y: number; age: number; size: number}
type Ripple = {x: number; y: number; age: number; r: number}
type Drip = {x: number; grow: number; y: number; vy: number}
type Bead = {x: number; y: number; r: number; vy: number; slide: boolean; pause: number; trail: number; wobble: number}

const rand = (a: number, b: number) => a + Math.random() * (b - a)

export class Rain {
  private layers: Layer[]
  private splashes: Splash[] = []
  private ripples: Ripple[] = []
  private drips: Drip[]
  private beads: Bead[] = []
  private nextBead = 0
  private flash = 0
  private nextFlash = rand(20, 45)
  private t = 0
  private snapshot = document.createElement('canvas')
  // Sấm (ChillScene nối sang ChillAudio)
  onThunder: (() => void) | null = null

  constructor(
    private glass: Box,
    private panes: {x: number; w: number}[],
    private road: {top: number; bottom: number},
  ) {
    const L = (n: number, len: [number, number], speed: [number, number], ground: [number, number] | null, alpha: number, width: number, splash: number): Layer => ({
      streaks: Array.from({length: n}, () => this.streak(len, speed, ground, true)),
      len,
      speed,
      ground,
      alpha,
      width,
      splash,
    })
    const {top, bottom} = road
    this.layers = [
      L(190, [5, 8], [250, 300], [top - 4, top + 8], 0.3, 0.5, 0.25),
      L(100, [10, 16], [380, 450], [top + 6, bottom - 1], 0.45, 0.75, 0.6),
      L(24, [24, 36], [620, 720], null, 0.28, 2, 0),
    ]
    this.drips = [0.18, 0.5, 0.83].flatMap((k) => panes.map((p) => ({x: Math.round(p.x + p.w * k), grow: rand(0, 1), y: -1, vy: 0})))
    for (let i = 0; i < 45; i++) this.beads.push(this.bead())
  }

  private streak(len: [number, number], speed: [number, number], ground: [number, number] | null, anywhere = false): Streak {
    const g = this.glass
    return {
      x: g.x + rand(0, g.w + 80),
      y: anywhere ? g.y + rand(0, g.h) : g.y - rand(0, 40),
      len: rand(...len),
      speed: rand(...speed),
      ground: ground ? rand(...ground) : g.y + g.h + 40,
    }
  }

  private bead(r = rand(0.6, 1.9)): Bead {
    const p = this.panes[Math.floor(Math.random() * this.panes.length)]
    return {x: p.x + rand(3, p.w - 3), y: this.glass.y + rand(4, this.glass.h - 8), r, vy: 0, slide: false, pause: 0, trail: 0, wobble: rand(0, 6)}
  }

  // Mưa nặng hạt / dịu theo đợt (0.55–1)
  private get intensity() {
    const t = this.t
    return 0.72 + 0.18 * Math.sin(t * 0.09) + 0.1 * Math.sin(t * 0.37 + 1.3)
  }

  // Độ nghiêng vệt mưa (px ngang / px dọc): gió thổi từng cơn
  private get slant() {
    const t = this.t
    return -0.2 - 0.07 * Math.sin(t * 0.21) - 0.05 * Math.max(0, Math.sin(t * 0.8)) ** 3
  }

  // Giọt nước trên kính chỗ mèo sắp khều; khều trúng thì cho trượt xuống
  plant(x: number, y: number) {
    const b: Bead = {...this.bead(2.4), x, y}
    this.beads.push(b)
    return b
  }

  poke(b: Bead) {
    b.slide = true
    b.vy = 45
    b.pause = 0
  }

  update(dt: number) {
    this.t += dt
    const g = this.glass
    const slant = this.slant
    for (const layer of this.layers) {
      for (const s of layer.streaks) {
        s.y += s.speed * dt
        s.x += s.speed * dt * slant
        if (s.y >= s.ground) {
          if (layer.splash && s.y < g.y + g.h && Math.random() < layer.splash) {
            this.splashes.push({x: s.x, y: Math.round(s.ground), age: 0, size: layer.splash > 0.5 ? 2 : 1})
          }
          Object.assign(s, this.streak(layer.len, layer.speed, layer.ground))
        }
      }
    }
    for (const sp of this.splashes) sp.age += dt
    this.splashes = this.splashes.filter((sp) => sp.age < 0.26)

    // Vũng nước gợn vòng trên mặt đường
    if (Math.random() < dt * 22 * this.intensity) {
      this.ripples.push({x: g.x + rand(0, g.w), y: rand(this.road.top + 8, this.road.bottom - 1), age: 0, r: rand(3, 6)})
    }
    for (const rp of this.ripples) rp.age += dt
    this.ripples = this.ripples.filter((rp) => rp.age < 0.6)

    // Nước nhỏ giọt từ mái hiên: đọng lại rồi rơi
    for (const d of this.drips) {
      if (d.y < 0) {
        d.grow += dt / rand(1.2, 3.2)
        if (d.grow >= 1) {
          d.y = g.y + 2
          d.vy = 20
        }
      } else {
        d.vy += 900 * dt
        d.y += d.vy * dt
        if (d.y > g.y + g.h) {
          this.splashes.push({x: d.x, y: this.road.top + 2, age: 0, size: 2})
          d.y = -1
          d.grow = 0
        }
      }
    }

    this.updateBeads(dt)

    // Chớp: loé 2 lần rồi tắt; sấm đến sau vài giây
    this.flash = Math.max(0, this.flash - dt * 2.2)
    this.nextFlash -= dt
    if (this.nextFlash <= 0) {
      this.flash = 1
      this.nextFlash = rand(28, 70)
      setTimeout(() => this.onThunder?.(), rand(700, 2600))
    }
  }

  private updateBeads(dt: number) {
    const g = this.glass
    this.nextBead -= dt
    if (this.nextBead <= 0 && this.beads.length < 70) {
      this.beads.push(this.bead(Math.random() < 0.15 ? rand(2, 2.8) : undefined))
      this.nextBead = rand(0.05, 0.25) / this.intensity
    }
    const born: Bead[] = []
    for (const b of this.beads) {
      if (!b.slide) {
        b.r = Math.min(3.4, b.r + dt * 0.03 * Math.random())
        if (b.r > 2.6 && Math.random() < dt * 0.4) b.slide = true
        continue
      }
      // Trượt từng đoạn: có lúc khựng lại (vướng) rồi đi tiếp
      if (b.pause > 0) {
        b.pause -= dt
        continue
      }
      if (Math.random() < dt * 0.8) b.pause = rand(0.1, 0.7)
      b.vy = Math.min(70, b.vy + dt * 60)
      b.y += b.vy * dt * (b.r / 3)
      b.x += Math.sin(b.y * 0.15 + b.wobble) * dt * 3
      b.trail += b.vy * dt
      if (b.trail > 3) {
        b.trail = 0
        if (Math.random() < 0.6) born.push({...b, r: rand(0.5, 0.9), slide: false, vy: 0, x: b.x + rand(-0.5, 0.5), y: b.y - b.r - 1})
      }
    }
    // Giọt đang trượt nuốt giọt nhỏ nằm trên đường
    for (const b of this.beads) {
      if (!b.slide) continue
      for (const o of this.beads) {
        if (o === b || o.r <= 0 || o.slide) continue
        if (Math.abs(o.x - b.x) < b.r + o.r && Math.abs(o.y - b.y) < b.r + o.r) {
          b.r = Math.min(4, Math.sqrt(b.r * b.r + o.r * o.r))
          o.r = 0
        }
      }
    }
    this.beads = this.beads.filter((b) => b.r > 0 && b.y < g.y + g.h - 2).concat(born)
  }

  // Ngoài kính (trong vùng clip kính): vũng gợn, vệt mưa, giọt mái hiên, bắn nước
  drawOutside(ctx: CanvasRenderingContext2D, night: boolean) {
    const tone = night ? '185,198,225' : '210,222,236'
    ctx.lineWidth = 1
    for (const rp of this.ripples) {
      const k = rp.age / 0.6
      ctx.strokeStyle = `rgba(${tone},${(0.28 * (1 - k)).toFixed(3)})`
      ctx.beginPath()
      ctx.ellipse(rp.x, rp.y + 0.5, 0.5 + rp.r * k, 0.3 + rp.r * k * 0.28, 0, 0, Math.PI * 2)
      ctx.stroke()
    }

    const slant = this.slant
    const visible = this.intensity
    for (const layer of this.layers) {
      const n = Math.floor(layer.streaks.length * visible)
      ctx.lineWidth = layer.width
      // Đuôi mờ + đầu sáng, gom thành 2 path cho nhẹ
      for (const [part, alpha] of [
        [0, layer.alpha * 0.45],
        [1, layer.alpha],
      ] as const) {
        ctx.strokeStyle = `rgba(${tone},${alpha.toFixed(3)})`
        ctx.beginPath()
        for (let i = 0; i < n; i++) {
          const s = layer.streaks[i]
          const half = s.len / 2
          const y0 = s.y - s.len + part * half
          ctx.moveTo(s.x - (s.len - part * half) * slant, y0)
          ctx.lineTo(s.x - (half - part * half) * slant, y0 + half)
        }
        ctx.stroke()
      }
    }

    ctx.fillStyle = `rgba(${tone},0.7)`
    for (const d of this.drips) {
      if (d.y < 0) ctx.fillRect(d.x, this.glass.y + 1, 1, d.grow > 0.5 ? 2 : 1)
      else ctx.fillRect(d.x, d.y, 1, Math.min(6, 1 + d.vy / 90))
    }

    for (const sp of this.splashes) {
      const k = sp.age / 0.26
      const a = (0.55 * (1 - k)).toFixed(3)
      ctx.fillStyle = `rgba(${tone},${a})`
      if (k < 0.2) {
        ctx.fillRect(Math.round(sp.x), sp.y - 1, 1, 1)
        continue
      }
      // Vương miện: 2–3 tia bắn ra 2 bên theo đường cong
      const spread = sp.size * 2.2 * k
      const hop = Math.sin(Math.PI * k) * sp.size * 2
      ctx.fillRect(Math.round(sp.x - spread), Math.round(sp.y - hop), 1, 1)
      ctx.fillRect(Math.round(sp.x + spread), Math.round(sp.y - hop), 1, 1)
      if (sp.size > 1) ctx.fillRect(Math.round(sp.x), Math.round(sp.y - hop * 1.5), 1, 1)
    }
  }

  // Trên kính: hơi nước mép dưới + giọt đọng (khúc xạ) + ánh chớp.
  // `source` là canvas đệm — chụp lại 1 lần để giọt nước lấy hình phía sau.
  drawGlass(ctx: CanvasRenderingContext2D, source: HTMLCanvasElement, night: boolean) {
    const g = this.glass
    for (const p of this.panes) {
      const fog = ctx.createLinearGradient(0, g.y + g.h - 34, 0, g.y + g.h)
      fog.addColorStop(0, 'rgba(200,210,225,0)')
      fog.addColorStop(1, night ? 'rgba(150,165,200,0.22)' : 'rgba(215,224,235,0.26)')
      ctx.fillStyle = fog
      ctx.fillRect(p.x, g.y + g.h - 34, p.w, 34)
    }

    const snap = this.snapshot
    if (snap.width !== source.width) {
      snap.width = source.width
      snap.height = source.height
    }
    snap.getContext('2d')!.drawImage(source, 0, 0)
    // Canvas đệm có thể lớn hơn hệ toạ độ 640×360 đang vẽ (RES) → quy đổi toạ độ lấy mẫu
    const k = source.width / 640

    for (const b of this.beads) {
      const r = b.r
      if (r < 1.3) {
        // Giọt li ti: chỉ hơi sáng hơn nền, không thành chấm trắng như tuyết
        ctx.fillStyle = night ? 'rgba(170,185,215,0.16)' : 'rgba(225,236,250,0.2)'
        ctx.fillRect(Math.round(b.x), Math.round(b.y), 1, 1)
        continue
      }
      const x = Math.round(b.x)
      const y = Math.round(b.y)
      ctx.save()
      ctx.beginPath()
      ctx.ellipse(x, y, r, r * 1.08, 0, 0, Math.PI * 2)
      ctx.clip()
      // Thấu kính: lấy vùng rộng gấp ~3 lần phía trên giọt, lật ngược, thu nhỏ vào trong
      const span = r * 6
      ctx.translate(x, y)
      ctx.scale(1, -1)
      ctx.drawImage(snap, (x - span / 2) * k, (y - span * 0.65) * k, span * k, span * k, -r, -r * 1.08, r * 2, r * 2.16)
      ctx.restore()
      ctx.fillStyle = 'rgba(10,14,24,0.28)'
      ctx.fillRect(x - Math.round(r * 0.6), y + Math.round(r) - 1, Math.max(1, Math.round(r * 1.2)), 1)
      ctx.fillStyle = night ? 'rgba(235,240,255,0.45)' : 'rgba(255,255,255,0.6)'
      ctx.fillRect(x - Math.round(r * 0.45), y - Math.round(r * 0.5), 1, 1)
      if (r > 2.2) {
        ctx.fillStyle = 'rgba(255,255,255,0.3)'
        ctx.fillRect(x + Math.round(r * 0.3), y + Math.round(r * 0.4), 1, 1)
      }
      if (b.slide && b.vy > 5) {
        // Vệt ướt ngay phía trên giọt đang trượt
        ctx.fillStyle = 'rgba(220,232,248,0.14)'
        ctx.fillRect(x - 1, y - r - 6, 2, 6)
      }
    }

    if (this.flash > 0) {
      const f = this.flash > 0.75 || (this.flash > 0.35 && this.flash < 0.5) ? this.flash : this.flash * 0.3
      ctx.fillStyle = `rgba(225,232,255,${(f * 0.55).toFixed(3)})`
      ctx.fillRect(g.x, g.y, g.w, g.h)
    }
  }

  // Ánh chớp hắt vào trong phòng (vẽ sau nội thất)
  drawRoomFlash(ctx: CanvasRenderingContext2D, w: number, h: number) {
    if (this.flash <= 0.3) return
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    ctx.fillStyle = `rgba(150,160,210,${((this.flash - 0.3) * 0.18).toFixed(3)})`
    ctx.fillRect(0, 0, w, h)
    ctx.restore()
  }
}
