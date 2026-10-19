'use client'

// Bản thu nhỏ của /chill để nhúng (khối /embed của Notion, blog…): cảnh cửa sổ quán,
// nút phát, đổi trạm, bật mưa và link sang quán đầy đủ. Không có chat, nhật ký, bàn
// nhóm hay mời cà phê — trang nằm trong iframe của site khác nên không có ô nhập liệu
// hay chuyển tiền nào.
//
// - Dùng lại bộ vẽ cảnh (scene.ts) và bộ phát (audio.ts) của /chill
// - Cảnh chỉ vẽ khi khung đang hiện trên màn hình; nhạc vẫn phát khi cuộn đi chỗ khác
// - Tham số tuỳ chọn trên link: ?place=<id điểm đến>&station=<acoustic|focus|sax|lofi|study>

import {useCallback, useEffect, useRef, useState} from 'react'
import {trackEvent} from '@/lib/analytics'
import {ChillAudio} from './audio'
import type {Destination} from './destinations'
import {useLang} from './i18n'
import type {ChillScene, TimeOfDay, Weather} from './scene'
import {STATIONS, stationOf, type StationId, type Track} from './tracks'

const POSTER = '/chill/scenes/room-cafe-thumb.webp'

const STRINGS = {
  en: {
    play: 'Play',
    pause: 'Pause',
    next: 'Next track',
    rainOn: 'Turn rain on',
    rainOff: 'Turn rain off',
    open: 'Open the café',
    terms: 'Terms & copyright',
    times: {morning: 'Morning', afternoon: 'Afternoon', night: 'Night'},
  },
  vi: {
    play: 'Phát',
    pause: 'Dừng',
    next: 'Bài tiếp',
    rainOn: 'Bật mưa',
    rainOff: 'Tắt mưa',
    open: 'Vào quán',
    terms: 'Điều khoản & bản quyền',
    times: {morning: 'Sáng', afternoon: 'Chiều', night: 'Tối'},
  },
} as const

// Giờ ngoài cửa sổ theo đồng hồ của điểm đến
function timeOfDay(timeZone: string): TimeOfDay {
  const hour = Number(new Intl.DateTimeFormat('en-GB', {hour: '2-digit', hour12: false, timeZone}).format(new Date()))
  if (hour >= 5 && hour < 11) return 'morning'
  if (hour >= 11 && hour < 18) return 'afternoon'
  return 'night'
}

// Trang đang nằm trong khung của site nào (để biết khung nhúng được dùng ở đâu)
function embedHost() {
  if (window.top === window) return 'direct'
  try {
    return new URL(document.referrer).hostname || 'unknown'
  } catch {
    return 'unknown'
  }
}

export function ChillEmbed({tracks, destinations}: {tracks: Track[]; destinations: Destination[]}) {
  const t = STRINGS[useLang()]
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sceneRef = useRef<ChillScene | null>(null)
  const audioRef = useRef<ChillAudio | null>(null)
  const [host, setHost] = useState('unknown')
  const startTracked = useRef(false)

  const [dest, setDest] = useState(destinations[0])
  const [time, setTime] = useState<TimeOfDay>('morning')
  const [weather, setWeather] = useState<Weather>('clear')
  const [station, setStation] = useState<StationId>(() => stationOf(tracks[0]))
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [started, setStarted] = useState(false)
  const [live, setLive] = useState(false)

  const stations = STATIONS.filter((st) => tracks.some((tr) => stationOf(tr) === st.id))
  const track = tracks[index]

  // Đọc tham số trên link + ghi nhận 1 lượt hiện khung nhúng
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const place = destinations.find((d) => d.id === params.get('place'))
    const wanted = params.get('station')
    const first = tracks.findIndex((tr) => stationOf(tr) === wanted)
    const where = embedHost()
    /* eslint-disable react-hooks/set-state-in-effect */
    if (place) setDest(place)
    if (first >= 0) {
      setStation(wanted as StationId)
      setIndex(first)
    }
    setHost(where)
    /* eslint-enable react-hooks/set-state-in-effect */
    trackEvent({name: 'Chill Embed', props: {action: 'view', host: where}})
  }, [destinations, tracks])

  // Giờ trong cảnh theo đồng hồ thật của điểm đến, cập nhật mỗi phút
  useEffect(() => {
    const tick = () => setTime(timeOfDay(dest.timeZone))
    tick()
    const id = setInterval(tick, 60_000)
    return () => clearInterval(id)
  }, [dest.timeZone])

  // Vòng vẽ cảnh ~30fps, chỉ chạy khi khung hiện trên màn hình và tab đang mở
  useEffect(() => {
    const wrap = wrapRef.current!
    const canvas = canvasRef.current!
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let scene: ChillScene | null = null
    let cancelled = false
    let visible = false
    let raf = 0
    let lastDraw = 0
    let shown = false

    // Ảnh của cảnh tải xong (mặt bàn đã có màu) mới cho canvas hiện đè lên ảnh tĩnh.
    // Ảnh phố từ Sanity CDN (khác domain) làm canvas không đọc lại được điểm ảnh —
    // lúc đó ảnh phố đã vẽ lên rồi, coi như cảnh đã sẵn sàng
    const drawn = () => {
      try {
        const px = canvas.getContext('2d')!.getImageData(Math.floor(canvas.width / 2), Math.floor(canvas.height * 0.86), 1, 1).data
        return px[3] > 0 && px[0] + px[1] + px[2] > 40
      } catch {
        return true
      }
    }

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop)
      if (now - lastDraw < 33) return
      lastDraw = now
      scene?.frame(now)
      if (!shown && drawn()) {
        shown = true
        setLive(true)
      }
      // Người xem bật "giảm chuyển động": vẽ đủ 1 cảnh rồi đứng yên
      if (shown && still) cancelAnimationFrame(raf)
    }
    const sync = () => {
      cancelAnimationFrame(raf)
      raf = 0
      if (scene && visible && !document.hidden) raf = requestAnimationFrame(loop)
    }
    const fit = () => {
      const dpr = window.devicePixelRatio || 1
      scene?.resize(wrap.clientWidth * dpr, wrap.clientHeight * dpr)
    }

    void import('./scene').then(({ChillScene}) => {
      if (cancelled) return
      scene = new ChillScene(canvas)
      scene.onSound = (kind, pan, dir, len) => audioRef.current?.streetSound(kind, pan, dir, len)
      sceneRef.current = scene
      fit()
      // Hiệu ứng bên dưới đặt giờ / thời tiết thật; lần đầu đặt ngay để khỏi vẽ cảnh mặc định
      scene.setAtmosphere(timeOfDay(dest.timeZone), 'clear', dest)
      sync()
    })

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      sync()
    })
    io.observe(wrap)
    const ro = new ResizeObserver(fit)
    ro.observe(wrap)
    document.addEventListener('visibilitychange', sync)

    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      io.disconnect()
      ro.disconnect()
      document.removeEventListener('visibilitychange', sync)
      sceneRef.current = null
    }
    // Cảnh chỉ tạo 1 lần; đổi điểm đến / giờ / thời tiết đi qua setAtmosphere bên dưới
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    sceneRef.current?.setAtmosphere(time, weather, dest)
  }, [time, weather, dest, live])

  useEffect(() => {
    sceneRef.current?.setMusic(playing)
  }, [playing])

  useEffect(() => {
    const audio = new ChillAudio()
    audioRef.current = audio
    return () => audio.destroy()
  }, [])

  // Mưa → tiếng mưa trên mái hiên, trời quang → tiếng phố (như /chill)
  useEffect(() => {
    audioRef.current?.setAmbience(0.35, weather === 'rain' ? 'rain' : 'street')
  }, [weather])

  const playAt = useCallback(
    (i: number, crossfade = false) => {
      const audio = audioRef.current
      if (!audio) return
      audio.play(tracks[i], crossfade)
      setIndex(i)
      setStarted(true)
      setPlaying(true)
      if (!startTracked.current) {
        startTracked.current = true
        trackEvent({name: 'Chill Embed', props: {action: 'play', host}})
      }
    },
    [tracks, host]
  )

  // Bài kế tiếp trong cùng trạm, hết trạm thì vòng lại đầu
  const nextIndex = useCallback(
    (from: number) => {
      const list = tracks.map((tr, i) => ({tr, i})).filter(({tr}) => stationOf(tr) === stationOf(tracks[from]))
      const pos = list.findIndex(({i}) => i === from)
      return list[(pos + 1) % list.length]?.i ?? from
    },
    [tracks]
  )

  // Sắp hết bài → chồng mờ sang bài tiếp; onEnded là dự phòng
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.onNearEnd = () => playAt(nextIndex(index), true)
    audio.onEnded = () => playAt(nextIndex(index))
  }, [index, nextIndex, playAt])

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return
    if (!started) {
      audio.setAmbience(0.35, weather === 'rain' ? 'rain' : 'street', true)
      return playAt(index)
    }
    if (playing) {
      audio.pause()
      setPlaying(false)
    } else {
      audio.resume()
      setPlaying(true)
    }
  }

  const changeStation = (id: StationId) => {
    if (id === station) return
    setStation(id)
    const first = tracks.findIndex((tr) => stationOf(tr) === id)
    if (first < 0) return
    if (playing) playAt(first, true)
    else {
      setIndex(first)
      setStarted(false)
      audioRef.current?.pause()
    }
  }

  const fullCafe = `/chill?${new URLSearchParams({utm_source: 'embed', utm_medium: 'widget', utm_campaign: host})}`

  return (
    <div className="@container fixed inset-0 overflow-hidden bg-[#0f0d12] font-mono text-white">
      <div ref={wrapRef} className="absolute inset-0">
        {/* eslint-disable-next-line @next/next/no-img-element -- pixel art 320×180 phóng nguyên điểm ảnh, không qua bộ tối ưu ảnh */}
        <img src={POSTER} alt="" width={320} height={180} className="absolute inset-0 h-full w-full object-cover [image-rendering:pixelated]" />
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={`Pixel art: a café window in ${dest.name}, ${t.times[time].toLowerCase()}`}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${live ? 'opacity-100' : 'opacity-0'}`}
        />
      </div>

      <div className="pointer-events-none absolute left-2 top-2 bg-black/55 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-white/90 backdrop-blur">
        {dest.name} · {t.times[time]}
      </div>

      <a
        href={fullCafe}
        target="_blank"
        rel="noopener"
        onClick={() => trackEvent({name: 'Chill Embed', props: {action: 'open', host}})}
        className="absolute right-2 top-2 bg-[#e8b27d] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#2a1a10] transition-colors hover:bg-[#f3c89a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        {t.open} ↗
      </a>

      {/* Điều khoản khi nhúng: phải giữ link về quán, không sửa rồi đóng gói lại */}
      <a
        href="/chill/terms"
        target="_blank"
        rel="noopener"
        aria-label={t.terms}
        title={t.terms}
        className="absolute right-2 top-9 px-1 text-[10px] text-white/55 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-white"
      >
        ©
      </a>

      <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-gradient-to-t from-black/80 via-black/55 to-transparent px-2 pb-2 pt-6">
        <button
          type="button"
          onClick={togglePlay}
          aria-label={playing ? t.pause : t.play}
          className="flex h-9 w-9 shrink-0 items-center justify-center bg-[#e8b27d] text-[#2a1a10] transition-colors hover:bg-[#f3c89a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          {playing ? <PauseIcon /> : <PlayIcon />}
        </button>

        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-bold">{track.title}</p>
          <p className="truncate text-[10px] text-white/60">{track.mood}</p>
        </div>

        <div className="hidden items-center gap-1 @[480px]:flex">
          {stations.map((st) => (
            <button
              key={st.id}
              type="button"
              onClick={() => changeStation(st.id)}
              aria-pressed={st.id === station}
              className={`px-2 py-1 text-[10px] uppercase tracking-[0.12em] transition-colors focus-visible:outline-2 focus-visible:outline-white ${
                st.id === station ? 'bg-white/90 text-[#16131a]' : 'bg-black/40 text-white/75 hover:text-white'
              }`}
            >
              {st.short}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setWeather((w) => (w === 'rain' ? 'clear' : 'rain'))}
          aria-label={weather === 'rain' ? t.rainOff : t.rainOn}
          aria-pressed={weather === 'rain'}
          className={`flex h-8 w-8 shrink-0 items-center justify-center transition-colors focus-visible:outline-2 focus-visible:outline-white ${
            weather === 'rain' ? 'bg-white/90 text-[#16131a]' : 'bg-black/40 text-white/80 hover:text-white'
          }`}
        >
          <RainIcon />
        </button>
        <button
          type="button"
          onClick={() => playAt(nextIndex(index), playing)}
          aria-label={t.next}
          className="flex h-8 w-8 shrink-0 items-center justify-center bg-black/40 text-white/80 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-white"
        >
          <NextIcon />
        </button>
      </div>
    </div>
  )
}

function PlayIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M7 4.5v15a1 1 0 0 0 1.5.86l12-7.5a1 1 0 0 0 0-1.72l-12-7.5A1 1 0 0 0 7 4.5Z" />
    </svg>
  )
}

function PauseIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
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

function RainIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20 16.6A5 5 0 0 0 18 7h-1.3A8 8 0 1 0 4 15.3M16 14v6M8 14v6M12 16v6" />
    </svg>
  )
}
