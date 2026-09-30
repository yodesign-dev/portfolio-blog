// Bộ phát âm thanh của trang /chill — chạy hoàn toàn trên trình duyệt.
//
// Sơ đồ:
//   bài mp3  → <audio> ─────────────────────────────┐
//   bài synth → trackBus → lọc lo-fi → saturate ────┼→ master (âm lượng) → analyser → loa
//                        ↘ reverb ──────────────────┘
//   ambience (mưa / tiếng phố) → ambienceGain → loa   (âm lượng riêng)

import type {SynthSpec, Track} from './tracks'

export type Ambience = 'street' | 'rain' | 'quiet'
export type StreetSound = 'whoosh' | 'whoosh-big' | 'horn' | 'bark'

const midiToHz = (note: number) => 440 * Math.pow(2, (note - 69) / 12)

function noiseBuffer(ctx: AudioContext, seconds: number, color: 'white' | 'pink' | 'brown') {
  const length = Math.floor(ctx.sampleRate * seconds)
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  let last = 0
  let b0 = 0
  let b1 = 0
  let b2 = 0
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1
    if (color === 'white') {
      data[i] = white
    } else if (color === 'brown') {
      last = (last + 0.02 * white) / 1.02
      data[i] = last * 3.5
    } else {
      b0 = 0.99765 * b0 + white * 0.099046
      b1 = 0.963 * b1 + white * 0.2965164
      b2 = 0.57 * b2 + white * 1.0526913
      data[i] = (b0 + b1 + b2 + white * 0.1848) * 0.2
    }
  }
  return buffer
}

// Tiếng "lạo xạo" của đĩa than: gần như im lặng, thỉnh thoảng 1 tiếng tách
function crackleBuffer(ctx: AudioContext) {
  const length = ctx.sampleRate * 4
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < length; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.015
    if (Math.random() < 0.0004) data[i] = (Math.random() * 2 - 1) * 0.8
  }
  return buffer
}

function impulseResponse(ctx: AudioContext, seconds: number) {
  const length = Math.floor(ctx.sampleRate * seconds)
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch)
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 3)
    }
  }
  return buffer
}

export class ChillAudio {
  onEnded: (() => void) | null = null

  private ctx: AudioContext | null = null
  private master!: GainNode
  private analyser!: AnalyserNode
  private tone!: BiquadFilterNode
  private reverb!: ConvolverNode
  private delay!: DelayNode
  private wobble!: GainNode
  private crackle!: GainNode
  private white!: AudioBuffer
  private rainGain!: GainNode
  private streetGain!: GainNode
  private sfxGain!: GainNode
  private element: HTMLAudioElement | null = null
  private sfxIn: AudioNode | null = null

  private track: Track | null = null
  private trackBus: GainNode | null = null
  private playing = false
  private timer: ReturnType<typeof setInterval> | null = null
  private step = 0
  private nextTime = 0
  // Vị trí phát của bài synth = offset + (thời gian đã chạy từ lần resume)
  private offset = 0
  private resumedAt = 0

  private volume = 0.7
  private ambienceLevel = 0.35
  private ambience: Ambience = 'street'

  get isPlaying() {
    return this.playing
  }

  // AudioContext chỉ được tạo sau thao tác của người dùng (chính sách autoplay)
  private ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume()
      return this.ctx
    }
    const ctx = new AudioContext()
    this.ctx = ctx

    this.analyser = ctx.createAnalyser()
    this.analyser.fftSize = 64
    this.analyser.smoothingTimeConstant = 0.8
    this.analyser.connect(ctx.destination)

    this.master = ctx.createGain()
    this.master.gain.value = this.volume * this.volume
    this.master.connect(this.analyser)

    // Chuỗi lo-fi cho bài synth: lọc bớt treble + saturate nhẹ
    this.tone = ctx.createBiquadFilter()
    this.tone.type = 'lowpass'
    this.tone.frequency.value = 2400
    const shaper = ctx.createWaveShaper()
    const curve = new Float32Array(1024)
    for (let i = 0; i < curve.length; i++) {
      curve[i] = Math.tanh(((i / curve.length) * 2 - 1) * 1.6)
    }
    shaper.curve = curve
    this.tone.connect(shaper).connect(this.master)

    this.reverb = ctx.createConvolver()
    this.reverb.buffer = impulseResponse(ctx, 2.6)
    const reverbGain = ctx.createGain()
    reverbGain.gain.value = 0.35
    this.reverb.connect(reverbGain).connect(this.master)

    this.delay = ctx.createDelay(1)
    const feedback = ctx.createGain()
    feedback.gain.value = 0.3
    this.delay.connect(feedback).connect(this.delay)
    this.delay.connect(this.reverb)

    // "Wow & flutter" — băng cassette hơi chao, gắn vào detune của mọi nốt
    const lfo = ctx.createOscillator()
    lfo.frequency.value = 0.45
    this.wobble = ctx.createGain()
    this.wobble.gain.value = 7
    lfo.connect(this.wobble)
    lfo.start()

    this.white = noiseBuffer(ctx, 2, 'white')

    const crackleSrc = ctx.createBufferSource()
    crackleSrc.buffer = crackleBuffer(ctx)
    crackleSrc.loop = true
    this.crackle = ctx.createGain()
    this.crackle.gain.value = 0
    crackleSrc.connect(this.crackle).connect(this.master)
    crackleSrc.start()

    // Ambience đi thẳng ra loa, không bị âm lượng nhạc ảnh hưởng
    const rain = ctx.createBufferSource()
    rain.buffer = noiseBuffer(ctx, 4, 'pink')
    rain.loop = true
    const rainHp = ctx.createBiquadFilter()
    rainHp.type = 'highpass'
    rainHp.frequency.value = 400
    const rainLp = ctx.createBiquadFilter()
    rainLp.type = 'lowpass'
    rainLp.frequency.value = 5000
    this.rainGain = ctx.createGain()
    this.rainGain.gain.value = 0
    rain.connect(rainHp).connect(rainLp).connect(this.rainGain).connect(ctx.destination)
    rain.start()

    const street = ctx.createBufferSource()
    street.buffer = noiseBuffer(ctx, 5, 'brown')
    street.loop = true
    const streetLp = ctx.createBiquadFilter()
    streetLp.type = 'lowpass'
    streetLp.frequency.value = 500
    this.streetGain = ctx.createGain()
    this.streetGain.gain.value = 0
    street.connect(streetLp).connect(this.streetGain).connect(ctx.destination)
    street.start()

    // Âm thanh ngoài phố (xe chạy qua, còi, chó sủa): lọc bớt treble như nghe
    // vọng qua cửa kính, âm lượng đi theo thanh Ambience
    const sfxLp = ctx.createBiquadFilter()
    sfxLp.type = 'lowpass'
    sfxLp.frequency.value = 1800
    this.sfxGain = ctx.createGain()
    this.sfxGain.gain.value = 0
    sfxLp.connect(this.sfxGain).connect(ctx.destination)
    this.sfxIn = sfxLp
    this.applyAmbience()

    return ctx
  }

  // ---------- Điều khiển ----------

  play(track: Track) {
    const ctx = this.ensure()
    this.stopCurrent()
    this.track = track
    this.offset = 0
    this.playing = true

    if (track.src) {
      const el = this.getElement(ctx)
      el.src = track.src
      void el.play()
    } else if (track.synth) {
      this.startSynth(ctx, track.synth)
    }
  }

  pause() {
    if (!this.playing || !this.ctx) return
    this.playing = false
    if (this.track?.src) {
      this.element?.pause()
    } else {
      this.offset = this.position()
      this.stopScheduler()
      this.crackle.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1)
    }
  }

  resume() {
    if (this.playing || !this.track) return
    const ctx = this.ensure()
    this.playing = true
    if (this.track.src) {
      void this.element?.play()
    } else if (this.track.synth) {
      this.resumedAt = ctx.currentTime
      this.nextTime = ctx.currentTime + 0.05
      this.startScheduler(this.track.synth)
      this.crackle.gain.setTargetAtTime(0.5, ctx.currentTime, 0.2)
    }
  }

  seek(seconds: number) {
    if (!this.track) return
    if (this.track.src && this.element) {
      this.element.currentTime = seconds
    } else {
      this.offset = seconds
      this.resumedAt = this.ctx?.currentTime ?? 0
    }
  }

  // Giây đã phát của bài hiện tại
  position() {
    if (!this.track || !this.ctx) return 0
    if (this.track.src) return this.element?.currentTime ?? 0
    return this.playing ? this.offset + (this.ctx.currentTime - this.resumedAt) : this.offset
  }

  duration() {
    if (!this.track) return 0
    const real = this.track.src ? this.element?.duration : undefined
    return real && Number.isFinite(real) ? real : this.track.duration
  }

  setVolume(value: number) {
    this.volume = value
    if (this.ctx) this.master.gain.setTargetAtTime(value * value, this.ctx.currentTime, 0.05)
  }

  setAmbience(level: number, kind: Ambience, start = false) {
    this.ambienceLevel = level
    this.ambience = kind
    if (start) this.ensure()
    this.applyAmbience()
  }

  // Âm thanh 1 sự kiện ngoài phố. pan -1…1 là vị trí trái/phải, dir là chiều
  // xe chạy (tiếng "vù" quét theo chiều đó). Chưa có AudioContext (người xem
  // chưa bấm gì) thì bỏ qua — không tự bật âm thanh.
  streetSound(kind: StreetSound, pan = 0, dir: 1 | -1 = 1) {
    const ctx = this.ctx
    if (!ctx || !this.sfxIn || this.ambienceLevel <= 0) return
    const now = ctx.currentTime
    const panner = ctx.createStereoPanner()
    panner.connect(this.sfxIn)

    if (kind === 'whoosh' || kind === 'whoosh-big') {
      const big = kind === 'whoosh-big'
      const len = big ? 1.8 : 1.2
      const src = ctx.createBufferSource()
      src.buffer = this.white
      const bp = ctx.createBiquadFilter()
      bp.type = 'bandpass'
      bp.frequency.setValueAtTime(big ? 380 : 650, now)
      bp.frequency.linearRampToValueAtTime(big ? 300 : 480, now + len)
      bp.Q.value = 0.9
      const env = ctx.createGain()
      env.gain.setValueAtTime(0, now)
      env.gain.linearRampToValueAtTime(big ? 0.5 : 0.3, now + len * 0.45)
      env.gain.linearRampToValueAtTime(0, now + len)
      panner.pan.setValueAtTime(-0.9 * dir, now)
      panner.pan.linearRampToValueAtTime(0.9 * dir, now + len)
      src.connect(bp).connect(env).connect(panner)
      src.start(now, Math.random())
      src.stop(now + len + 0.05)
      return
    }

    panner.pan.value = Math.max(-1, Math.min(1, pan))
    if (kind === 'horn') {
      // Còi xe máy "bíp bíp": 2 tiếng ngắn, 2 nốt chồng
      for (const [start, dur] of [
        [0, 0.12],
        [0.18, 0.16],
      ]) {
        const env = ctx.createGain()
        env.gain.setValueAtTime(0, now + start)
        env.gain.linearRampToValueAtTime(0.07, now + start + 0.01)
        env.gain.setValueAtTime(0.07, now + start + dur - 0.02)
        env.gain.linearRampToValueAtTime(0, now + start + dur)
        env.connect(panner)
        for (const f of [415, 523]) {
          const o = ctx.createOscillator()
          o.type = 'square'
          o.frequency.value = f
          o.connect(env)
          o.start(now + start)
          o.stop(now + start + dur + 0.02)
        }
      }
      return
    }

    // Chó sủa "gâu gâu"
    for (const start of [0, 0.22]) {
      const o = ctx.createOscillator()
      o.type = 'sawtooth'
      o.frequency.setValueAtTime(560, now + start)
      o.frequency.exponentialRampToValueAtTime(260, now + start + 0.11)
      const env = ctx.createGain()
      env.gain.setValueAtTime(0, now + start)
      env.gain.linearRampToValueAtTime(0.09, now + start + 0.01)
      env.gain.exponentialRampToValueAtTime(0.001, now + start + 0.14)
      o.connect(env).connect(panner)
      o.start(now + start)
      o.stop(now + start + 0.16)
    }
  }

  // Mức năng lượng theo dải tần cho thanh visualizer
  levels(out: Uint8Array<ArrayBuffer>) {
    if (!this.ctx) return out.fill(0)
    this.analyser.getByteFrequencyData(out)
    return out
  }

  destroy() {
    this.stopCurrent()
    this.element?.pause()
    void this.ctx?.close()
    this.ctx = null
  }

  // ---------- Nội bộ ----------

  private applyAmbience() {
    if (!this.ctx) return
    const now = this.ctx.currentTime
    const v = this.ambienceLevel
    const rain = this.ambience === 'rain' ? v * 0.5 : 0
    const street = this.ambience === 'street' ? v * 0.6 : this.ambience === 'rain' ? v * 0.15 : v * 0.25
    this.rainGain.gain.setTargetAtTime(rain, now, 0.4)
    this.streetGain.gain.setTargetAtTime(street, now, 0.4)
    this.sfxGain.gain.setTargetAtTime(this.ambience === 'quiet' ? v * 0.4 : v, now, 0.2)
  }

  private getElement(ctx: AudioContext) {
    if (!this.element) {
      const el = new Audio()
      el.crossOrigin = 'anonymous'
      el.preload = 'auto'
      el.addEventListener('ended', () => this.onEnded?.())
      ctx.createMediaElementSource(el).connect(this.master)
      this.element = el
    }
    return this.element
  }

  private stopCurrent() {
    this.playing = false
    this.stopScheduler()
    if (this.track?.src) this.element?.pause()
    if (this.trackBus && this.ctx) {
      const bus = this.trackBus
      bus.gain.setTargetAtTime(0, this.ctx.currentTime, 0.08)
      setTimeout(() => bus.disconnect(), 600)
      this.trackBus = null
    }
    if (this.ctx) this.crackle.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1)
  }

  private startSynth(ctx: AudioContext, spec: SynthSpec) {
    this.trackBus = ctx.createGain()
    this.trackBus.connect(this.tone)
    this.tone.frequency.setTargetAtTime(spec.tone, ctx.currentTime, 0.1)
    this.crackle.gain.setTargetAtTime(0.5, ctx.currentTime, 0.2)
    this.step = 0
    this.resumedAt = ctx.currentTime
    this.nextTime = ctx.currentTime + 0.05
    this.startScheduler(spec)
  }

  private startScheduler(spec: SynthSpec) {
    this.stopScheduler()
    const stepDur = 60 / spec.bpm / 4
    this.timer = setInterval(() => {
      const ctx = this.ctx
      if (!ctx || !this.playing) return
      if (this.position() >= this.duration()) {
        this.onEnded?.()
        return
      }
      // Tab chạy nền bị giảm tần suất setInterval → lên lịch xa hơn
      const ahead = document.hidden ? 1.5 : 0.15
      while (this.nextTime < ctx.currentTime + ahead) {
        this.scheduleStep(spec, this.step, this.nextTime, stepDur)
        this.nextTime += stepDur
        this.step++
      }
    }, 25)
  }

  private stopScheduler() {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
  }

  // 1 ô nhịp = 16 step (nốt móc kép)
  private scheduleStep(spec: SynthSpec, step: number, time: number, stepDur: number) {
    const s = step % 16
    const chord = spec.chords[Math.floor(step / 16) % spec.chords.length]
    const t = s % 2 === 1 ? time + stepDur * 0.2 : time // swing
    const barDur = stepDur * 16

    if (s === 0) chord.forEach((n, i) => this.keys(n, t + i * 0.012, barDur * 0.95, 0.16))
    if (s === 10 && Math.random() < 0.5) chord.slice(1).forEach((n) => this.keys(n, t, stepDur * 5, 0.08))

    const root = chord[0] >= 48 ? chord[0] - 12 : chord[0]
    if (s === 0) this.bass(root, t, stepDur * 7)
    if (s === 10 && Math.random() < 0.6) this.bass(Math.random() < 0.5 ? root : root + 7, t, stepDur * 4)

    if (spec.drums === 'full') {
      if (s === 0 || s === 10 || (s === 7 && Math.random() < 0.3)) this.kick(t, 0.9)
      if (s === 4 || s === 12) this.snare(t, 0.35)
      if (s % 2 === 0) this.hat(t, s % 4 === 0 ? 0.1 : 0.06)
      else if (Math.random() < 0.12) this.hat(t, 0.035)
    } else if (spec.drums === 'soft') {
      if (s === 0 || s === 8) this.kick(t, 0.55)
      if (s === 12) this.snare(t, 0.15)
      if (s % 4 === 2) this.hat(t, 0.05)
    }

    const chance = spec.melody * (s % 4 === 0 ? 1 : 0.4)
    if (s % 2 === 0 && Math.random() < chance) {
      const tones = chord.slice(1)
      const note = tones[Math.floor(Math.random() * tones.length)] + 12
      this.lead(note, t, stepDur * (2 + Math.floor(Math.random() * 3)))
    }
  }

  private voice(type: OscillatorType, freq: number) {
    const osc = this.ctx!.createOscillator()
    osc.type = type
    osc.frequency.value = freq
    this.wobble.connect(osc.detune)
    // Gỡ LFO khi nốt tắt, không thì node cũ không được giải phóng
    osc.onended = () => this.wobble.disconnect(osc.detune)
    return osc
  }

  // Electric piano: sine + triangle hơi lệch + 1 tine sáng tắt nhanh
  private keys(note: number, time: number, dur: number, vel: number) {
    const ctx = this.ctx!
    const bus = this.trackBus
    if (!bus) return
    const f = midiToHz(note)
    const env = ctx.createGain()
    env.gain.setValueAtTime(0, time)
    env.gain.linearRampToValueAtTime(vel, time + 0.015)
    env.gain.setTargetAtTime(vel * 0.45, time + 0.02, 0.5)
    env.gain.setTargetAtTime(0, time + dur, 0.25)
    env.connect(bus)
    env.connect(this.reverb)

    const a = this.voice('sine', f)
    const b = this.voice('triangle', f * 1.002)
    const bGain = ctx.createGain()
    bGain.gain.value = 0.35
    a.connect(env)
    b.connect(bGain).connect(env)

    const tine = this.voice('sine', f * 4)
    const tineEnv = ctx.createGain()
    tineEnv.gain.setValueAtTime(vel * 0.25, time)
    tineEnv.gain.exponentialRampToValueAtTime(0.0001, time + 0.3)
    tine.connect(tineEnv).connect(env)

    const end = time + dur + 1.5
    ;[a, b, tine].forEach((o) => {
      o.start(time)
      o.stop(end)
    })
  }

  private bass(note: number, time: number, dur: number) {
    const ctx = this.ctx!
    const bus = this.trackBus
    if (!bus) return
    const osc = this.voice('sine', midiToHz(note))
    const env = ctx.createGain()
    env.gain.setValueAtTime(0, time)
    env.gain.linearRampToValueAtTime(0.32, time + 0.02)
    env.gain.setTargetAtTime(0.2, time + 0.05, 0.3)
    env.gain.setTargetAtTime(0, time + dur, 0.08)
    osc.connect(env).connect(bus)
    osc.start(time)
    osc.stop(time + dur + 0.5)
  }

  private lead(note: number, time: number, dur: number) {
    const ctx = this.ctx!
    const bus = this.trackBus
    if (!bus) return
    const osc = this.voice('triangle', midiToHz(note))
    const env = ctx.createGain()
    env.gain.setValueAtTime(0, time)
    env.gain.linearRampToValueAtTime(0.06, time + 0.03)
    env.gain.setTargetAtTime(0, time + dur * 0.6, 0.2)
    osc.connect(env)
    env.connect(bus)
    env.connect(this.delay)
    osc.start(time)
    osc.stop(time + dur + 1.2)
  }

  private kick(time: number, vel: number) {
    const ctx = this.ctx!
    const bus = this.trackBus
    if (!bus) return
    const osc = ctx.createOscillator()
    osc.frequency.setValueAtTime(115, time)
    osc.frequency.exponentialRampToValueAtTime(42, time + 0.12)
    const env = ctx.createGain()
    env.gain.setValueAtTime(vel * 0.7, time)
    env.gain.exponentialRampToValueAtTime(0.001, time + 0.35)
    osc.connect(env).connect(bus)
    osc.start(time)
    osc.stop(time + 0.4)
  }

  private noiseHit(time: number, vel: number, filter: BiquadFilterType, freq: number, decay: number, send: boolean) {
    const ctx = this.ctx!
    const bus = this.trackBus
    if (!bus) return
    const src = ctx.createBufferSource()
    src.buffer = this.white
    const f = ctx.createBiquadFilter()
    f.type = filter
    f.frequency.value = freq
    const env = ctx.createGain()
    env.gain.setValueAtTime(vel, time)
    env.gain.exponentialRampToValueAtTime(0.001, time + decay)
    src.connect(f).connect(env).connect(bus)
    if (send) env.connect(this.reverb)
    src.start(time, Math.random() * 1.5)
    src.stop(time + decay + 0.05)
  }

  private snare(time: number, vel: number) {
    this.noiseHit(time, vel, 'bandpass', 1800, 0.18, true)
  }

  private hat(time: number, vel: number) {
    this.noiseHit(time, vel, 'highpass', 7000, 0.05, false)
  }
}
