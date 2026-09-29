'use client'

import {useCallback, useEffect, useRef, useState} from 'react'
import {ChillAudio, type Ambience} from './audio'
import {ChillScene, type TimeOfDay, type Weather} from './scene'
import {DESTINATIONS, type Destination} from './destinations'
import {TRACKS, type Track} from './tracks'
import {trackEvent} from '@/lib/analytics'

const PREFS_KEY = 'chill:prefs'

type Prefs = {
  trackId: string
  volume: number
  ambience: number
  time: TimeOfDay
  weather: Weather
  shuffle: boolean
  destination: string
  travel: number
}

// Tự chuyển điểm đến sau N phút (0 = tắt)
const TRAVEL_OPTIONS = [
  {value: 0, label: 'Off'},
  {value: 3, label: '3 min'},
  {value: 5, label: '5 min'},
  {value: 10, label: '10 min'},
]

const TIMES: {value: TimeOfDay; label: string; icon: React.ReactNode}[] = [
  {value: 'morning', label: 'Morning', icon: <SunriseIcon />},
  {value: 'afternoon', label: 'Afternoon', icon: <SunsetIcon />},
  {value: 'night', label: 'Night', icon: <MoonIcon />},
]

const WEATHERS: {value: Weather; label: string; icon: React.ReactNode}[] = [
  {value: 'clear', label: 'Clear', icon: <SunIcon />},
  {value: 'rain', label: 'Rain', icon: <RainIcon />},
  {value: 'mist', label: 'Mist', icon: <MistIcon />},
]

const AMBIENCE_FOR: Record<Weather, {kind: Ambience; label: string}> = {
  clear: {kind: 'street', label: 'Street sounds'},
  rain: {kind: 'rain', label: 'Rain on the awning'},
  mist: {kind: 'quiet', label: 'Quiet room'},
}

function formatTime(sec: number) {
  const s = Math.max(0, Math.floor(sec))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

function readPrefs(): Partial<Prefs> {
  try {
    return JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}') as Partial<Prefs>
  } catch {
    return {}
  }
}

// Mặc định dùng bộ có sẵn trong code; page.tsx truyền thêm nội dung từ Sanity
export function ChillRoom({tracks = TRACKS, destinations = DESTINATIONS}: {tracks?: Track[]; destinations?: Destination[]}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<ChillScene | null>(null)
  const audioRef = useRef<ChillAudio | null>(null)
  const scenePausedRef = useRef(false)

  const [loaded, setLoaded] = useState(false)
  const [time, setTime] = useState<TimeOfDay>('morning')
  const [weather, setWeather] = useState<Weather>('clear')
  const [index, setIndex] = useState(0)
  const [started, setStarted] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [volume, setVolume] = useState(0.7)
  const [ambience, setAmbience] = useState(0.35)
  const [shuffle, setShuffle] = useState(false)
  const [position, setPosition] = useState(0)
  const [duration, setDuration] = useState(tracks[0].duration)
  const [scenePaused, setScenePaused] = useState(false)
  const [clock, setClock] = useState('')
  const [destIndex, setDestIndex] = useState(0)
  const [travel, setTravel] = useState(5)
  const [travelElapsed, setTravelElapsed] = useState(0)

  const track = tracks[index]
  const dest = destinations[destIndex]
  const nextDest = destinations[(destIndex + 1) % destinations.length]

  // Khôi phục lựa chọn lần trước (chạy sau hydrate để HTML server/client khớp nhau)
  useEffect(() => {
    const prefs = readPrefs()
    const saved = tracks.findIndex((t) => t.id === prefs.trackId)
    /* eslint-disable react-hooks/set-state-in-effect */
    if (saved >= 0) {
      setIndex(saved)
      setDuration(tracks[saved].duration)
    }
    if (typeof prefs.volume === 'number') setVolume(prefs.volume)
    if (typeof prefs.ambience === 'number') setAmbience(prefs.ambience)
    if (prefs.time && ['morning', 'afternoon', 'night'].includes(prefs.time)) setTime(prefs.time)
    if (prefs.weather && ['clear', 'rain', 'mist'].includes(prefs.weather)) setWeather(prefs.weather)
    if (typeof prefs.shuffle === 'boolean') setShuffle(prefs.shuffle)
    const savedDest = destinations.findIndex((d) => d.id === prefs.destination)
    if (savedDest >= 0) setDestIndex(savedDest)
    if (TRAVEL_OPTIONS.some((o) => o.value === prefs.travel)) setTravel(prefs.travel!)
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) setScenePaused(true)
    setLoaded(true)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [tracks, destinations])

  useEffect(() => {
    if (!loaded) return
    const prefs: Prefs = {
      trackId: track.id,
      volume,
      ambience,
      time,
      weather,
      shuffle,
      destination: dest.id,
      travel,
    }
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
    } catch {
      // Chế độ ẩn danh / chặn storage — bỏ qua, trang vẫn chạy bình thường
    }
  }, [loaded, track.id, volume, ambience, time, weather, shuffle, dest.id, travel])

  // Vòng lặp vẽ cảnh, giới hạn ~30fps cho nhẹ máy
  useEffect(() => {
    const scene = new ChillScene(canvasRef.current!)
    sceneRef.current = scene
    let raf = 0
    let lastDraw = 0
    scene.frame(performance.now())
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop)
      if (scenePausedRef.current || now - lastDraw < 33) return
      lastDraw = now
      scene.frame(now)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  useEffect(() => {
    scenePausedRef.current = scenePaused
  }, [scenePaused])

  useEffect(() => {
    const scene = sceneRef.current
    if (!scene) return
    scene.setAtmosphere(time, weather, dest)
    scene.preload(nextDest)
    // Vẽ ngay 1 frame — không chờ rAF (bị dừng khi tab chạy nền / cảnh đang pause)
    scene.frame(performance.now())
  }, [time, weather, dest, nextDest])

  // ---------- Điểm đến ----------

  const travelRef = useRef(0)

  const goTo = useCallback((i: number) => {
    setDestIndex((i + destinations.length) % destinations.length)
    travelRef.current = 0
    setTravelElapsed(0)
  }, [destinations.length])

  // Tự chuyển ga: đếm từng giây, đủ N phút thì sang điểm đến tiếp theo
  useEffect(() => {
    if (!travel) return
    const id = setInterval(() => {
      travelRef.current += 1
      if (travelRef.current >= travel * 60) {
        travelRef.current = 0
        setDestIndex((d) => (d + 1) % destinations.length)
      }
      setTravelElapsed(travelRef.current)
    }, 1000)
    return () => clearInterval(id)
  }, [travel, destinations.length])

  useEffect(() => {
    sceneRef.current?.setMusic(playing)
  }, [playing])

  useEffect(() => {
    const audio = new ChillAudio()
    audioRef.current = audio
    return () => audio.destroy()
  }, [])

  useEffect(() => {
    audioRef.current?.setVolume(volume)
  }, [volume])

  useEffect(() => {
    audioRef.current?.setAmbience(ambience, AMBIENCE_FOR[weather].kind)
  }, [ambience, weather])

  // Giờ địa phương của điểm đến
  useEffect(() => {
    const format = () =>
      new Intl.DateTimeFormat('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: dest.timeZone,
      }).format(new Date())
    const tick = () => setClock(format())
    tick()
    const id = setInterval(tick, 15000)
    return () => clearInterval(id)
  }, [dest.timeZone])

  // ---------- Điều khiển nhạc ----------

  const playAt = useCallback((i: number) => {
    const audio = audioRef.current
    if (!audio) return
    const next = tracks[i]
    audio.play(next)
    setIndex(i)
    setStarted(true)
    setPlaying(true)
    setPosition(0)
    setDuration(next.duration)
    trackEvent({name: 'Chill Play', props: {track: next.id}})
  }, [tracks])

  const nextIndex = useCallback(
    (from: number) => {
      if (!shuffle || tracks.length < 2) return (from + 1) % tracks.length
      let i = from
      while (i === from) i = Math.floor(Math.random() * tracks.length)
      return i
    },
    [shuffle, tracks.length]
  )

  const next = useCallback(() => playAt(nextIndex(index)), [index, nextIndex, playAt])

  const prev = useCallback(() => {
    const audio = audioRef.current
    if (audio && started && audio.position() > 3) {
      audio.seek(0)
      setPosition(0)
      return
    }
    playAt((index - 1 + tracks.length) % tracks.length)
  }, [index, playAt, started, tracks.length])

  const togglePlay = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    if (!started) return playAt(index)
    if (playing) {
      audio.pause()
      setPlaying(false)
    } else {
      audio.resume()
      setPlaying(true)
    }
  }, [index, playAt, playing, started])

  // Hết bài → tự chuyển bài tiếp theo
  useEffect(() => {
    const audio = audioRef.current
    if (audio) audio.onEnded = next
  }, [next])

  useEffect(() => {
    if (!playing) return
    const id = setInterval(() => {
      const audio = audioRef.current
      if (!audio) return
      setPosition(audio.position())
      setDuration(audio.duration())
    }, 250)
    return () => clearInterval(id)
  }, [playing])

  // Phím media trên bàn phím / màn hình khoá điều khiển được nhạc
  useEffect(() => {
    if (!('mediaSession' in navigator) || !started) return
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: 'Chill for work',
      album: track.mood,
    })
    navigator.mediaSession.playbackState = playing ? 'playing' : 'paused'
    navigator.mediaSession.setActionHandler('play', togglePlay)
    navigator.mediaSession.setActionHandler('pause', togglePlay)
    navigator.mediaSession.setActionHandler('nexttrack', next)
    navigator.mediaSession.setActionHandler('previoustrack', prev)
  }, [started, playing, track, togglePlay, next, prev])

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current
    if (!audio || !started) return
    const rect = e.currentTarget.getBoundingClientRect()
    const sec = ((e.clientX - rect.left) / rect.width) * duration
    audio.seek(sec)
    setPosition(sec)
  }

  const changeAmbience = (value: number) => {
    setAmbience(value)
    // Kéo thanh ambience cũng là 1 thao tác người dùng → được phép bật âm thanh
    audioRef.current?.setAmbience(value, AMBIENCE_FOR[weather].kind, true)
  }

  const toggleFullscreen = () => {
    const stage = stageRef.current
    if (!stage) return
    if (document.fullscreenElement) void document.exitFullscreen()
    else void stage.requestFullscreen?.()
  }

  const timeLabel = TIMES.find((t) => t.value === time)!.label
  const weatherLabel = WEATHERS.find((w) => w.value === weather)!.label
  const progress = duration ? Math.min(1, position / duration) : 0

  return (
    <div className="bg-[#16131a] text-[#ede6dd]">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-8 sm:py-14">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-[#e8b27d]">Chill for work</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">Slow morning, strong coffee.</h1>
            <p className="mt-3 max-w-xl text-[#a79e94]">
              A pixel café by the window, somewhere in Vietnam. Put on a track, pick the weather, get to work.
            </p>
          </div>
          <p className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-[#a79e94]">
            <span className="h-2 w-2 rounded-full bg-[#e8b27d]" aria-hidden />
            {dest.name}, {dest.region}
            <span className="text-white/25">/</span>
            <span className="min-w-[3rem] tabular-nums text-[#ede6dd]">{clock}</span>
          </p>
        </header>

        <div
          ref={stageRef}
          className="relative mt-8 aspect-video overflow-hidden rounded-2xl border border-white/10 bg-black shadow-[0_30px_80px_-30px_rgba(0,0,0,0.8)]"
        >
          <canvas
            ref={canvasRef}
            className="absolute inset-0 h-full w-full [image-rendering:pixelated]"
            role="img"
            aria-label={`Pixel art: a person with headphones sipping phin coffee by a café window, ${dest.name} street outside, ${timeLabel.toLowerCase()}, ${weatherLabel.toLowerCase()}`}
          />
          <div className="pointer-events-none absolute left-3 top-3 flex gap-2 sm:left-5 sm:top-5">
            {[dest.name, weatherLabel, timeLabel].map((label) => (
              <span
                key={label}
                className="rounded-md bg-black/45 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-white/90 backdrop-blur sm:px-3 sm:py-1.5 sm:text-[11px]"
              >
                {label}
              </span>
            ))}
          </div>
          <div className="absolute bottom-3 right-3 flex gap-2 sm:bottom-5 sm:right-5">
            <StageButton label={scenePaused ? 'Resume scene' : 'Pause scene'} onClick={() => setScenePaused((p) => !p)}>
              {scenePaused ? <PlayIcon small /> : <PauseIcon small />}
            </StageButton>
            <StageButton label="Fullscreen" onClick={toggleFullscreen}>
              <FullscreenIcon />
            </StageButton>
          </div>
        </div>

        <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
          <div className="space-y-6">
            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
              <SectionTitle index="01" title="Destination" />
              <div className="mt-5 flex items-center gap-2">
                <RoundButton label="Previous destination" onClick={() => goTo(destIndex - 1)}>
                  <ArrowIcon dir="left" />
                </RoundButton>
                <select
                  value={destIndex}
                  onChange={(e) => goTo(Number(e.target.value))}
                  aria-label="Destination"
                  className="h-10 min-w-0 flex-1 rounded-xl border border-white/10 bg-[#1e1a22] px-3 text-sm text-[#ede6dd] focus-visible:outline-2 focus-visible:outline-[#e8b27d]"
                >
                  {destinations.map((d, i) => (
                    <option key={d.id} value={i}>
                      {String(i + 1).padStart(2, '0')} · {d.name}
                    </option>
                  ))}
                </select>
                <RoundButton label="Next destination" onClick={() => goTo(destIndex + 1)}>
                  <ArrowIcon dir="right" />
                </RoundButton>
              </div>
              <div className="mt-4 flex items-center justify-between gap-3">
                <label htmlFor="chill-travel" className="text-sm text-[#a79e94]">
                  Auto travel
                </label>
                <select
                  id="chill-travel"
                  value={travel}
                  onChange={(e) => {
                    setTravel(Number(e.target.value))
                    travelRef.current = 0
                    setTravelElapsed(0)
                  }}
                  className="h-9 rounded-lg border border-white/10 bg-[#1e1a22] px-2 text-sm text-[#ede6dd] focus-visible:outline-2 focus-visible:outline-[#e8b27d]"
                >
                  {TRAVEL_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mt-4 h-1 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-[#e8b27d] transition-[width] duration-1000 ease-linear"
                  style={{
                    width: travel ? `${Math.min(100, (travelElapsed / (travel * 60)) * 100)}%` : '0%',
                  }}
                />
              </div>
              <p className="mt-2 font-mono text-[11px] tabular-nums text-[#a79e94]">
                {String(destIndex + 1).padStart(2, '0')} / {String(destinations.length).padStart(2, '0')} · Next: {nextDest.name}
              </p>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
              <SectionTitle index="02" title="Atmosphere" />
              <div className="mt-5 space-y-4">
                <Field label="Time">
                  <Segmented options={TIMES} value={time} onChange={setTime} />
                </Field>
                <Field label="Weather">
                  <Segmented options={WEATHERS} value={weather} onChange={setWeather} />
                </Field>
                <Field label="Ambience">
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={ambience}
                      onChange={(e) => changeAmbience(Number(e.target.value))}
                      aria-label={`Ambience volume: ${AMBIENCE_FOR[weather].label}`}
                      className="w-full accent-[#e8b27d]"
                    />
                    <span className="w-32 shrink-0 text-right text-xs text-[#a79e94]">{AMBIENCE_FOR[weather].label}</span>
                  </div>
                </Field>
              </div>
            </section>
          </div>

          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
            <SectionTitle index="03" title="Music" />

            <div className="mt-5 flex items-center gap-4">
              <div className="flex shrink-0 items-center gap-2">
                <RoundButton label="Previous track" onClick={prev}>
                  <PrevIcon />
                </RoundButton>
                <button
                  type="button"
                  onClick={togglePlay}
                  aria-label={playing ? 'Pause' : 'Play'}
                  className="flex h-14 w-14 items-center justify-center rounded-full bg-[#e8b27d] text-[#2a1a10] transition hover:bg-[#f0c294] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e8b27d]"
                >
                  {playing ? <PauseIcon /> : <PlayIcon />}
                </button>
                <RoundButton label="Next track" onClick={next}>
                  <NextIcon />
                </RoundButton>
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#a79e94]">
                  Now playing · {index + 1}/{tracks.length}
                </p>
                <p className="mt-1 truncate text-lg font-semibold">{track.title}</p>
                <p className="truncate text-sm text-[#a79e94]">{track.mood}</p>
              </div>
              <Visualizer audioRef={audioRef} playing={playing} />
            </div>

            <div className="mt-5">
              <div
                role="slider"
                tabIndex={-1}
                aria-label="Seek"
                aria-valuemin={0}
                aria-valuemax={Math.round(duration)}
                aria-valuenow={Math.round(position)}
                onClick={seek}
                className="group relative h-4 cursor-pointer"
              >
                <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-white/10" />
                <div className="absolute left-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-[#e8b27d]" style={{width: `${progress * 100}%`}} />
              </div>
              <div className="mt-1 flex justify-between font-mono text-[11px] tabular-nums text-[#a79e94]">
                <span>{formatTime(position)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-3">
              <label className="flex flex-1 items-center gap-3 text-sm text-[#a79e94]">
                Volume
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  className="w-full max-w-48 accent-[#e8b27d]"
                />
              </label>
              <button
                type="button"
                onClick={() => setShuffle((s) => !s)}
                aria-pressed={shuffle}
                className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition ${
                  shuffle ? 'border-[#e8b27d]/60 bg-[#e8b27d]/15 text-[#f3cfa8]' : 'border-white/10 text-[#a79e94] hover:text-[#ede6dd]'
                }`}
              >
                <ShuffleIcon />
                Shuffle
              </button>
            </div>

            <ol className="mt-5 divide-y divide-white/[0.06] border-t border-white/[0.06]">
              {tracks.map((t, i) => {
                const active = i === index
                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => (active && started ? togglePlay() : playAt(i))}
                      aria-current={active ? 'true' : undefined}
                      className={`grid w-full grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-2 py-2.5 text-left transition ${
                        active ? 'bg-white/[0.06]' : 'hover:bg-white/[0.04]'
                      }`}
                    >
                      <span className="flex justify-center font-mono text-xs tabular-nums text-[#a79e94]">
                        {active && playing ? <EqualizerIcon /> : String(i + 1).padStart(2, '0')}
                      </span>
                      <span className="min-w-0">
                        <span className={`block truncate text-sm font-medium ${active ? 'text-[#f3cfa8]' : ''}`}>{t.title}</span>
                        <span className="block truncate text-xs text-[#a79e94]">{t.mood}</span>
                      </span>
                      <span className="font-mono text-xs tabular-nums text-[#a79e94]">{t.duration ? formatTime(t.duration) : '–:––'}</span>
                    </button>
                  </li>
                )
              })}
            </ol>
          </section>
        </div>

        <p className="mt-8 font-mono text-[11px] uppercase tracking-[0.2em] text-white/30">No rush. Just coffee. · Art &amp; music made with AI.</p>
      </div>
    </div>
  )
}

// ---------- Thành phần phụ ----------

function Visualizer({audioRef, playing}: {audioRef: React.RefObject<ChillAudio | null>; playing: boolean}) {
  const barsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const bars = barsRef.current ? Array.from(barsRef.current.children as HTMLCollectionOf<HTMLElement>) : []
    if (!playing) {
      bars.forEach((b) => (b.style.transform = 'scaleY(0.15)'))
      return
    }
    const data = new Uint8Array(32)
    let raf = 0
    const loop = () => {
      raf = requestAnimationFrame(loop)
      audioRef.current?.levels(data)
      bars.forEach((b, i) => {
        // Nhạc lo-fi đã cắt treble nên năng lượng dồn ở vài dải đầu
        const v = Math.min(1, (data[Math.min(data.length - 1, 1 + i)] / 255) * 1.4)
        b.style.transform = `scaleY(${Math.max(0.15, v * v).toFixed(2)})`
      })
    }
    loop()
    return () => cancelAnimationFrame(raf)
  }, [audioRef, playing])

  return (
    <div ref={barsRef} className="hidden h-8 items-center gap-[3px] sm:flex" aria-hidden>
      {Array.from({length: 12}).map((_, i) => (
        <span key={i} className="h-full w-[3px] origin-center rounded-full bg-[#e8b27d] transition-transform duration-75" />
      ))}
    </div>
  )
}

function SectionTitle({index, title}: {index: string; title: string}) {
  return (
    <h2 className="flex items-baseline gap-3 font-mono text-xs uppercase tracking-[0.25em]">
      <span className="text-[#a79e94]">{index}</span>
      <span>{title}</span>
    </h2>
  )
}

function Field({label, children}: {label: string; children: React.ReactNode}) {
  return (
    <div className="grid items-center gap-2 sm:grid-cols-[6rem_minmax(0,1fr)]">
      <span className="text-sm text-[#a79e94]">{label}</span>
      {children}
    </div>
  )
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: {value: T; label: string; icon: React.ReactNode}[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="grid grid-cols-3 gap-1 rounded-xl border border-white/10 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={`flex min-w-0 items-center justify-center gap-1.5 rounded-lg px-1.5 py-2 text-[13px] transition ${
            value === o.value ? 'bg-[#e8b27d]/15 text-[#f3cfa8]' : 'text-[#a79e94] hover:bg-white/[0.04] hover:text-[#ede6dd]'
          }`}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  )
}

function RoundButton({label, onClick, children}: {label: string; onClick: () => void; children: React.ReactNode}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-[#ede6dd] transition hover:bg-white/[0.06]"
    >
      {children}
    </button>
  )
}

function StageButton({label, onClick, children}: {label: string; onClick: () => void; children: React.ReactNode}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-9 w-9 items-center justify-center rounded-md bg-black/45 text-white/90 backdrop-blur transition hover:bg-black/65"
    >
      {children}
    </button>
  )
}

// ---------- Icon (SVG inline, 16px) ----------

const iconProps = {
  width: 16,
  height: 16,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

function PlayIcon({small}: {small?: boolean}) {
  const s = small ? 14 : 20
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M7 4.5v15a1 1 0 0 0 1.5.86l12-7.5a1 1 0 0 0 0-1.72l-12-7.5A1 1 0 0 0 7 4.5Z" />
    </svg>
  )
}

function PauseIcon({small}: {small?: boolean}) {
  const s = small ? 14 : 20
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
    </svg>
  )
}

function PrevIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M19 5v14l-10-7 10-7Z" />
      <rect x="5" y="5" width="2.5" height="14" rx="1" />
    </svg>
  )
}

function NextIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M5 5v14l10-7L5 5Z" />
      <rect x="16.5" y="5" width="2.5" height="14" rx="1" />
    </svg>
  )
}

function ArrowIcon({dir}: {dir: 'left' | 'right'}) {
  return (
    <svg {...iconProps}>
      <path d={dir === 'left' ? 'M19 12H5M11 6l-6 6 6 6' : 'M5 12h14M13 6l6 6-6 6'} />
    </svg>
  )
}

function ShuffleIcon() {
  return (
    <svg {...iconProps}>
      <path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
    </svg>
  )
}

function FullscreenIcon() {
  return (
    <svg {...iconProps} width={14} height={14}>
      <path d="M8 3H3v5M21 8V3h-5M16 21h5v-5M3 16v5h5" />
    </svg>
  )
}

function SunIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  )
}

function SunriseIcon() {
  return (
    <svg {...iconProps}>
      <path d="M17 18a5 5 0 0 0-10 0M12 2v7M4.2 10.2l1.4 1.4M1 18h2M21 18h2M18.4 11.6l1.4-1.4M23 22H1M8 6l4-4 4 4" />
    </svg>
  )
}

function SunsetIcon() {
  return (
    <svg {...iconProps}>
      <path d="M17 18a5 5 0 0 0-10 0M12 9V2M4.2 10.2l1.4 1.4M1 18h2M21 18h2M18.4 11.6l1.4-1.4M23 22H1M16 5l-4 4-4-4" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg {...iconProps}>
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
    </svg>
  )
}

function RainIcon() {
  return (
    <svg {...iconProps}>
      <path d="M20 16.6A5 5 0 0 0 18 7h-1.3A8 8 0 1 0 4 15.3M16 14v6M8 14v6M12 16v6" />
    </svg>
  )
}

function MistIcon() {
  return (
    <svg {...iconProps}>
      <path d="M4 14h16M4 18h12M6 10h14M8 6h10" />
    </svg>
  )
}

function EqualizerIcon() {
  return (
    <span className="flex h-3 items-end gap-[2px]" aria-label="Playing">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="w-[3px] animate-[chill-eq_0.9s_ease-in-out_infinite] rounded-full bg-[#e8b27d]"
          style={{animationDelay: `${delay}ms`}}
        />
      ))}
    </span>
  )
}
