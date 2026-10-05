'use client'

import Link from 'next/link'
import {useCallback, useEffect, useRef, useState} from 'react'
import {ChillAudio, type Ambience} from './audio'
import {ChillScene, SCENE_H, SCENE_W, type TimeOfDay, type Weather} from './scene'
import {DESTINATIONS, type Destination} from './destinations'
import {STATIONS, TRACKS, stationOf, type StationId, type Track} from './tracks'
import {trackEvent} from '@/lib/analytics'
import {Wishlist} from './Wishlist'
import {ShareButton} from './ShareButton'
import {GroupTable} from './GroupTable'
import {SupporterBoard, type Board} from './SupporterBoard'
import {hasDonate, loadCup} from './donate-config'
import {THEMES, type ThemeId} from './themes'
import {Changelog, WhatsNewButton, useUpdatesSeen, type ChillUpdate} from './Changelog'
import {ChillChat} from './ChillChat'

const PREFS_KEY = 'chill:prefs'
// Đã từng bấm vào mèo → thôi hiện bong bóng gợi ý
const CAT_PETTED_KEY = 'chill:cat-petted'
// Đã mở bảng cài đặt lần nào chưa — chưa thì nút Settings sáng lên + gợi ý
const SETTINGS_SEEN_KEY = 'chill:settings-seen'
// Gợi ý hiện sau khi bấm Play bao lâu, và tự ẩn sau bao lâu
const SETTINGS_HINT_DELAY_MS = 3000
const SETTINGS_HINT_MS = 8000
const CAT_HINT_DELAY = 4000
// Mèo nói cảm ơn sau khi người xem bấm "I've sent it" ở mục donate
const CAT_THANKS = 'Cám ơn bạn đã mời cafe Meo!'
const CAT_SAY_MS = 4500
// Không đụng chuột/phím bao lâu thì giấu giao diện
const IDLE_MS = 3500

type Box = {left: number; top: number; width: number; height: number}

type Prefs = {
  trackId: string
  volume: number
  ambience: number
  time: TimeOfDay
  weather: Weather
  shuffle: boolean
  station: StationId
  destination: string
  travel: number
  theme: ThemeId
  panelTab: PanelTab
}

// Bảng cài đặt chia 3 tab để khỏi cuộn dài — tab cuối cùng mở được nhớ lại
type PanelTab = 'music' | 'scene' | 'atmosphere'

const PANEL_TABS: {id: PanelTab; label: string; icon: React.ReactNode}[] = [
  {id: 'music', label: 'Music', icon: <MusicIcon />},
  {id: 'scene', label: 'Scene', icon: <MapIcon />},
  {id: 'atmosphere', label: 'Atmosphere', icon: <CloudIcon />},
]

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
export function ChillRoom({
  tracks = TRACKS,
  destinations = DESTINATIONS,
  updates = [],
}: {
  tracks?: Track[]
  destinations?: Destination[]
  updates?: ChillUpdate[]
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sceneRef = useRef<ChillScene | null>(null)
  const audioRef = useRef<ChillAudio | null>(null)
  const scenePausedRef = useRef(false)
  // Tính lại vùng bấm (mèo, cuốn sổ) — gán trong effect dựng cảnh
  const fitRef = useRef<() => void>(() => {})

  const [loaded, setLoaded] = useState(false)
  const [time, setTime] = useState<TimeOfDay>('morning')
  const [weather, setWeather] = useState<Weather>('clear')
  const [index, setIndex] = useState(0)
  const [started, setStarted] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [volume, setVolume] = useState(0.7)
  const [ambience, setAmbience] = useState(0.35)
  const [shuffle, setShuffle] = useState(false)
  const [station, setStation] = useState<StationId>('acoustic')
  const [position, setPosition] = useState(0)
  const [duration, setDuration] = useState(tracks[0].duration)
  const [scenePaused, setScenePaused] = useState(false)
  const [clock, setClock] = useState('')
  const [destIndex, setDestIndex] = useState(0)
  const [travel, setTravel] = useState(5)
  const [theme, setTheme] = useState<ThemeId>('cafe')
  const [panelTab, setPanelTab] = useState<PanelTab>('music')
  const [travelElapsed, setTravelElapsed] = useState(0)
  // Vị trí con mèo trên màn hình (px CSS) để đặt nút bấm + bong bóng gợi ý
  const [catBox, setCatBox] = useState<Box | null>(null)
  const [bookBox, setBookBox] = useState<Box | null>(null)
  const [jarBox, setJarBox] = useState<Box | null>(null)
  const [wishOpen, setWishOpen] = useState(false)
  // Lọ tip + bảng cảm ơn: số ly Bin đã xác nhận, người đồng ý hiện tên
  const [board, setBoard] = useState<Board | null>(null)
  const [boardOpen, setBoardOpen] = useState(false)
  const [myCup, setMyCup] = useState(false)
  const [donateRequest, setDonateRequest] = useState(0)
  // Nhật ký thay đổi. `returning` = máy này đã từng vào /chill (có prefs từ trước)
  const [updatesOpen, setUpdatesOpen] = useState(false)
  // Phòng chat (góc phải, chung chỗ với Wishlist) — Studio có thể tắt
  const [chatOpen, setChatOpen] = useState(false)
  const [chatAvailable, setChatAvailable] = useState(false)
  const [returning, setReturning] = useState<boolean | null>(null)
  const [catPetted, setCatPetted] = useState(true)
  const [catHint, setCatHint] = useState(false)
  // Bong bóng lời nói của mèo: chờ hiện (khung donate đang che mèo trên điện thoại) → hiện → mờ dần
  const [catSay, setCatSay] = useState<{text: string; show: boolean} | null>(null)
  const catSayQueued = useRef<string | null>(null)
  const catSayTimers = useRef<number[]>([])

  const track = tracks[index]
  // Playlist của trạm đang chọn (index vẫn là vị trí trong toàn bộ `tracks`)
  const stationList = tracks.map((t, i) => ({t, i})).filter(({t}) => stationOf(t) === station)
  const stationPos = stationList.findIndex(({i}) => i === index)
  const dest = destinations[destIndex]
  const nextDest = destinations[(destIndex + 1) % destinations.length]

  // Khôi phục lựa chọn lần trước (chạy sau hydrate để HTML server/client khớp nhau)
  useEffect(() => {
    const prefs = readPrefs()
    let hadPrefs = false
    try {
      hadPrefs = localStorage.getItem(PREFS_KEY) !== null
    } catch {
      // Chặn storage → coi như khách mới
    }
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
    const savedStation = STATIONS.find((st) => st.id === prefs.station)?.id
    // Không có lựa chọn cũ thì mở trạm có bài đầu tiên (ưu tiên Café Acoustic)
    const firstStation = savedStation ?? STATIONS.find((st) => tracks.some((t) => stationOf(t) === st.id))?.id ?? 'lofi'
    setStation(saved >= 0 ? stationOf(tracks[saved]) : firstStation)
    if (saved < 0) {
      const first = tracks.findIndex((t) => stationOf(t) === firstStation)
      if (first >= 0) {
        setIndex(first)
        setDuration(tracks[first].duration)
      }
    }
    const savedDest = destinations.findIndex((d) => d.id === prefs.destination)
    if (savedDest >= 0) setDestIndex(savedDest)
    if (TRAVEL_OPTIONS.some((o) => o.value === prefs.travel)) setTravel(prefs.travel!)
    if (THEMES.some((t) => t.id === prefs.theme)) setTheme(prefs.theme!)
    if (PANEL_TABS.some((t) => t.id === prefs.panelTab)) setPanelTab(prefs.panelTab!)
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) setScenePaused(true)
    try {
      setCatPetted(localStorage.getItem(CAT_PETTED_KEY) === '1')
    } catch {
      setCatPetted(false)
    }
    setReturning(hadPrefs)
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
      station,
      destination: dest.id,
      travel,
      theme,
      panelTab,
    }
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
    } catch {
      // Chế độ ẩn danh / chặn storage — bỏ qua, trang vẫn chạy bình thường
    }
  }, [loaded, track.id, volume, ambience, time, weather, shuffle, station, dest.id, travel, theme, panelTab])

  // Vòng lặp vẽ cảnh, giới hạn ~30fps cho nhẹ máy
  useEffect(() => {
    const scene = new ChillScene(canvasRef.current!)
    sceneRef.current = scene
    // Tiếng xe chạy qua, còi, chó sủa ngoài phố → phát qua bộ âm thanh (theo thanh Ambience)
    scene.onSound = (kind, pan, dir) => audioRef.current?.streetSound(kind, pan, dir)
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
    // Canvas vẽ ở bội số nguyên của 640×360 vừa đủ phủ khung hiển thị (px thiết bị)
    const canvas = canvasRef.current!
    const fit = () => {
      const dpr = window.devicePixelRatio || 1
      const portrait = window.matchMedia('(orientation: portrait)').matches
      const cw = canvas.clientWidth
      const ch = canvas.clientHeight
      scene.resize(cw * dpr, ch * dpr, !portrait)
      // Cùng phép co giãn như object-cover / object-contain của canvas
      const bw = SCENE_W * 2
      const bh = SCENE_H * 2
      const k = (portrait ? Math.min : Math.max)(cw / bw, ch / bh)
      const toBox = (hit: {x: number; y: number; w: number; h: number}): Box | null => {
        const left = (cw - bw * k) / 2 + hit.x * k
        const top = (ch - bh * k) / 2 + hit.y * k
        return left + hit.w * k < 0 || left > cw ? null : {left, top, width: hit.w * k, height: hit.h * k}
      }
      setCatBox(toBox(scene.catHitBox))
      const book = scene.notebookHitBox
      setBookBox(book ? toBox(book) : null)
      setJarBox(hasDonate() ? toBox(scene.tipJarHitBox) : null)
    }
    fitRef.current = fit
    const ro = new ResizeObserver(fit)
    ro.observe(canvas)
    fit()
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [])

  // Đổi căn phòng → mèo / cuốn sổ ở chỗ khác, tính lại vùng bấm
  useEffect(() => {
    const scene = sceneRef.current
    if (!scene) return
    scene.setTheme(theme)
    fitRef.current()
    scene.frame(performance.now())
  }, [theme])

  useEffect(() => {
    scenePausedRef.current = scenePaused
    sceneRef.current?.setPaused(scenePaused)
  }, [scenePaused])

  useEffect(() => {
    const scene = sceneRef.current
    if (!scene) return
    scene.setAtmosphere(time, weather, dest)
    scene.preload(nextDest)
    // Vẽ ngay 1 frame — không chờ rAF (bị dừng khi tab chạy nền / cảnh đang pause)
    scene.frame(performance.now())
  }, [time, weather, dest, nextDest])

  // ---------- Lọ tip + bảng cảm ơn ----------

  const loadBoard = useCallback(() => {
    fetch('/api/chill-support')
      .then((r) => r.json())
      .then((d: Board) => setBoard({cups: d.cups ?? 0, supporters: d.supporters ?? []}))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!hasDonate()) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMyCup(loadCup())
    loadBoard()
  }, [loadBoard])

  useEffect(() => {
    const scene = sceneRef.current
    if (!scene) return
    scene.setTipJar(board?.cups ?? 0, myCup)
    scene.frame(performance.now())
  }, [board, myCup])

  // Bàn nhóm: mỗi người bạn đang ở bàn sáng 1 bóng trên dây đèn của quán
  const onTable = useCallback((friends: number | null) => {
    const scene = sceneRef.current
    if (!scene) return
    scene.setFriendLights(friends)
    scene.frame(performance.now())
  }, [])

  const updatesSeen = useUpdatesSeen(updates, returning)

  const openUpdates = (from: 'button' | 'toast') => {
    setPanelOpen(false)
    setWishOpen(false)
    setBoardOpen(false)
    setUpdatesOpen(true)
    updatesSeen.markSeen()
    trackEvent({name: 'Chill Updates Open', props: {from}})
  }

  const openBoard = () => {
    setUpdatesOpen(false)
    setPanelOpen(false)
    setWishOpen(false)
    setBoardOpen(true)
    loadBoard()
    trackEvent({name: 'Chill Board Open'})
  }

  // ---------- Mèo ----------

  // Chưa bấm vào mèo lần nào → sau vài giây hiện bong bóng "Pet me"
  useEffect(() => {
    if (catPetted) return
    const id = setTimeout(() => setCatHint(true), CAT_HINT_DELAY)
    return () => clearTimeout(id)
  }, [catPetted])

  const petCat = useCallback(() => {
    const kind = sceneRef.current?.petCat()
    if (!kind) return
    audioRef.current?.catSound(kind)
    // Cảnh đang pause vẫn vẽ lại 1 frame cho thấy mèo ngẩng lên
    sceneRef.current?.frame(performance.now())
    setCatHint(false)
    if (!catPetted) {
      setCatPetted(true)
      trackEvent({name: 'Chill Pet Cat'})
      try {
        localStorage.setItem(CAT_PETTED_KEY, '1')
      } catch {
        // Chặn storage — lần sau lại hiện gợi ý, không sao
      }
    }
  }, [catPetted])

  const sayCat = useCallback((text: string) => {
    catSayTimers.current.forEach(clearTimeout)
    setCatSay({text, show: true})
    catSayTimers.current = [
      window.setTimeout(() => setCatSay((c) => (c ? {...c, show: false} : c)), CAT_SAY_MS),
      window.setTimeout(() => setCatSay(null), CAT_SAY_MS + 600),
    ]
  }, [])
  useEffect(() => () => catSayTimers.current.forEach(clearTimeout), [])

  // Người xem báo đã mời cafe → mèo ngẩng lên, kêu, tim bay + nói cảm ơn.
  // Màn nhỏ: khung donate là bottom sheet che mèo → để dành câu nói tới lúc đóng khung.
  const thankCat = useCallback(() => {
    // Đồng xu rơi vào lọ, ly cà phê của người mời hiện trên bàn
    sceneRef.current?.dropCoin()
    setMyCup(true)
    petCat()
    if (window.matchMedia('(min-width: 1024px)').matches) sayCat(CAT_THANKS)
    else catSayQueued.current = CAT_THANKS
  }, [petCat, sayCat])

  useEffect(() => {
    if (wishOpen || !catSayQueued.current) return
    const text = catSayQueued.current
    catSayQueued.current = null
    // Chờ khung trượt xuống xong
    const id = window.setTimeout(() => sayCat(text), 350)
    return () => clearTimeout(id)
  }, [wishOpen, sayCat])

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

  // crossfade: bài đang phát nhỏ dần, bài mới to dần (chuyển bài tự động / đổi trạm)
  const playAt = useCallback((i: number, crossfade = false) => {
    const audio = audioRef.current
    if (!audio) return
    const next = tracks[i]
    audio.play(next, crossfade)
    setIndex(i)
    setStarted(true)
    setPlaying(true)
    setPosition(0)
    setDuration(next.duration)
    trackEvent({name: 'Chill Play', props: {track: next.id}})
  }, [tracks])

  // Bài kế tiếp trong CÙNG trạm (vòng lại đầu trạm khi hết)
  const nextIndex = useCallback(
    (from: number) => {
      const list = tracks.map((t, i) => ({t, i})).filter(({t}) => stationOf(t) === stationOf(tracks[from]))
      if (list.length < 2) return list[0]?.i ?? from
      const pos = list.findIndex(({i}) => i === from)
      if (!shuffle) return list[(pos + 1) % list.length].i
      let k = pos
      while (k === pos) k = Math.floor(Math.random() * list.length)
      return list[k].i
    },
    [shuffle, tracks]
  )

  const next = useCallback(() => playAt(nextIndex(index)), [index, nextIndex, playAt])
  const nextSmooth = useCallback(() => playAt(nextIndex(index), true), [index, nextIndex, playAt])

  const prev = useCallback(() => {
    const audio = audioRef.current
    if (audio && started && audio.position() > 3) {
      audio.seek(0)
      setPosition(0)
      return
    }
    const list = tracks.map((t, i) => ({t, i})).filter(({t}) => stationOf(t) === stationOf(tracks[index]))
    const pos = list.findIndex(({i}) => i === index)
    playAt(list[(pos - 1 + list.length) % list.length].i)
  }, [index, playAt, started, tracks])

  const changeStation = (id: StationId) => {
    if (id === station) return
    setStation(id)
    const first = tracks.findIndex((t) => stationOf(t) === id)
    if (first < 0) return
    if (playing) playAt(first, true)
    else {
      setIndex(first)
      setPosition(0)
      setDuration(tracks[first].duration)
      setStarted(false)
      audioRef.current?.pause()
    }
  }

  // Nút "Thử ngay" trong nhật ký: đưa người xem tới đúng tính năng
  const runAction = (action: string) => {
    setUpdatesOpen(false)
    trackEvent({name: 'Chill Update Try', props: {action}})
    const [kind, id] = action.split(':')
    if (kind === 'room' && THEMES.some((t) => t.id === id)) {
      setTheme(id as ThemeId)
      setPanelTab('scene')
    } else if (kind === 'station' && STATIONS.some((st) => st.id === id)) {
      changeStation(id as StationId)
      setPanelTab('music')
    }
    else if (kind === 'board') openBoard()
    else if (kind === 'wishlist') {
      setChatOpen(false)
      setWishOpen(true)
    } else if (kind === 'settings') {
      setChatOpen(false)
      setPanelOpen(true)
    } else if (kind === 'chat') setChatOpen(true)
  }

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

  // Sắp hết bài → chồng mờ sang bài tiếp theo (liền mạch như 1 bản mix);
  // onEnded chỉ là dự phòng khi trình duyệt không báo kịp
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.onNearEnd = nextSmooth
    audio.onEnded = next
  }, [next, nextSmooth])

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

  const toggleFullscreen = useCallback(() => {
    // Cả trang (không chỉ canvas) vào fullscreen để dock + bảng cài đặt vẫn dùng được
    if (document.fullscreenElement) void document.exitFullscreen()
    else void document.documentElement.requestFullscreen?.().catch(() => {})
  }, [])

  // ---------- Chế độ tập trung ----------

  const [panelOpen, setPanelOpen] = useState(false)
  const [volumeOpen, setVolumeOpen] = useState(false)

  // Chạm ra ngoài thì đóng thanh volume nổi (chỉ có trên điện thoại)
  useEffect(() => {
    if (!volumeOpen) return
    const onDown = (e: PointerEvent) => {
      if (!(e.target as HTMLElement).closest('#chill-volume, [aria-controls="chill-volume"]')) setVolumeOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [volumeOpen])

  // Người chưa mở cài đặt lần nào: nút Settings có vòng cam lan + gợi ý ngắn.
  // Mặc định coi như đã thấy để server render không nháy hiệu ứng
  const [settingsSeen, setSettingsSeen] = useState(true)
  const [hintShown, setHintShown] = useState(false)
  const [hintTip, setHintTip] = useState(false)
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- đọc localStorage sau khi hydrate
      setSettingsSeen(localStorage.getItem(SETTINGS_SEEN_KEY) === '1')
    } catch {
      // Chặn storage → không làm phiền bằng gợi ý
    }
  }, [])
  useEffect(() => {
    if (!panelOpen || settingsSeen) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mở cài đặt lần đầu thì tắt hẳn gợi ý
    setSettingsSeen(true)
    setHintTip(false)
    try {
      localStorage.setItem(SETTINGS_SEEN_KEY, '1')
    } catch {
      // bỏ qua
    }
  }, [panelOpen, settingsSeen])
  // Hiện sau khi bấm Play một lúc, nhường thông báo "Có gì mới" hiện trước
  const otherOverlay = wishOpen || chatOpen || boardOpen || updatesOpen || updatesSeen.toast
  useEffect(() => {
    if (settingsSeen || hintShown || !started || panelOpen || otherOverlay) return
    const t = window.setTimeout(() => {
      setHintShown(true)
      setHintTip(true)
    }, SETTINGS_HINT_DELAY_MS)
    return () => window.clearTimeout(t)
  }, [settingsSeen, hintShown, started, panelOpen, otherOverlay])
  useEffect(() => {
    if (!hintTip) return
    const t = window.setTimeout(() => setHintTip(false), SETTINGS_HINT_MS)
    return () => window.clearTimeout(t)
  }, [hintTip])
  const settingsGlow = hintShown && !settingsSeen
  const showHintTip = hintTip && !settingsSeen && !panelOpen && !volumeOpen && !otherOverlay
  const [idle, setIdle] = useState(false)
  const [hovering, setHovering] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [canFullscreen, setCanFullscreen] = useState(false)
  const idleTimer = useRef<number | undefined>(undefined)

  // Không đụng chuột/phím một lúc → giấu dock, thanh trên và con trỏ (như YouTube)
  useEffect(() => {
    const wake = () => {
      setIdle(false)
      window.clearTimeout(idleTimer.current)
      idleTimer.current = window.setTimeout(() => setIdle(true), IDLE_MS)
    }
    const events = ['pointermove', 'pointerdown', 'keydown', 'wheel'] as const
    events.forEach((e) => window.addEventListener(e, wake, {passive: true}))
    wake()
    return () => {
      events.forEach((e) => window.removeEventListener(e, wake))
      window.clearTimeout(idleTimer.current)
    }
  }, [])

  useEffect(() => {
    // iOS Safari không cho fullscreen phần tử thường → ẩn nút luôn
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    setCanFullscreen(Boolean(document.fullscreenEnabled))
    const sync = () => setFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', sync)
    return () => document.removeEventListener('fullscreenchange', sync)
  }, [])

  // Phím tắt: Space phát/dừng · N/P chuyển bài · F fullscreen · S cài đặt · C chat · W wishlist · Esc đóng
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const el = e.target as HTMLElement
      if (el.closest('input, select, textarea, [contenteditable="true"]')) return
      switch (e.key) {
        case ' ':
          // Space trên nút đang focus đã tự bấm nút đó rồi
          if (el.closest('button, a')) return
          e.preventDefault()
          togglePlay()
          break
        case 'n':
        case 'N':
          next()
          break
        case 'p':
        case 'P':
          prev()
          break
        case 'f':
        case 'F':
          if (document.fullscreenEnabled) toggleFullscreen()
          break
        case 's':
        case 'S':
          setWishOpen(false)
          setChatOpen(false)
          setBoardOpen(false)
          setUpdatesOpen(false)
          setPanelOpen((o) => !o)
          break
        case 'c':
        case 'C':
          setPanelOpen(false)
          setWishOpen(false)
          setBoardOpen(false)
          setUpdatesOpen(false)
          setChatOpen((o) => !o)
          break
        case 'w':
        case 'W':
          setChatOpen(false)
          setPanelOpen(false)
          setBoardOpen(false)
          setUpdatesOpen(false)
          setWishOpen((o) => !o)
          break
        case 'Escape':
          setVolumeOpen(false)
          setChatOpen(false)
          setPanelOpen(false)
          setBoardOpen(false)
          setUpdatesOpen(false)
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [togglePlay, next, prev, toggleFullscreen])

  // Đang phát nhạc thì giữ màn hình không tự tắt (trình duyệt tự nhả khi tab ẩn)
  useEffect(() => {
    if (!playing || !('wakeLock' in navigator)) return
    let lock: WakeLockSentinel | null = null
    let cancelled = false
    const acquire = () => {
      if (document.visibilityState !== 'visible') return
      navigator.wakeLock
        .request('screen')
        .then((l) => {
          if (cancelled) void l.release()
          else lock = l
        })
        .catch(() => {})
    }
    acquire()
    document.addEventListener('visibilitychange', acquire)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', acquire)
      void lock?.release()
    }
  }, [playing])

  // Tên bài lên tiêu đề tab — làm việc ở tab khác vẫn biết đang nghe gì
  const baseTitle = useRef('')
  useEffect(() => {
    if (!baseTitle.current) baseTitle.current = document.title
    if (started) document.title = `${playing ? '▶' : '❚❚'} ${track.title} · Chill`
  }, [started, playing, track.title])
  useEffect(() => () => void (document.title = baseTitle.current || document.title), [])

  const timeLabel = TIMES.find((t) => t.value === time)!.label
  const weatherLabel = WEATHERS.find((w) => w.value === weather)!.label
  const progress = duration ? Math.min(1, position / duration) : 0
  const stationLabel = STATIONS.find((st) => st.id === station)?.label ?? ''
  const hideUi = idle && started && !panelOpen && !volumeOpen && !showHintTip && !wishOpen && !chatOpen && !boardOpen && !updatesOpen && !updatesSeen.toast && !hovering
  const fade = `transition-opacity duration-700 ${hideUi ? 'pointer-events-none opacity-0' : 'opacity-100'}`
  const hoverProps = {onPointerEnter: () => setHovering(true), onPointerLeave: () => setHovering(false)}

  return (
    <div className={`relative h-dvh w-full select-none overflow-hidden bg-[#16131a] text-[#ede6dd] ${hideUi ? 'cursor-none' : ''}`}>
      <h1 className="sr-only">Chill for work — slow morning, strong coffee</h1>

      {/* Ngang: cảnh phủ kín màn hình · Dọc (điện thoại): giữ nguyên khung, không cắt mất người ngồi */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full object-cover portrait:object-contain"
        role="img"
        aria-label={`Pixel art: a person with headphones sipping phin coffee by a café window, ${dest.name} street outside, ${timeLabel.toLowerCase()}, ${weatherLabel.toLowerCase()}`}
      />

      {/* Mèo trên bậu cửa: bấm (hoặc Tab + Enter) để vuốt ve — mèo ngẩng lên, kêu, tim bay lên */}
      {catBox && (
        <button
          type="button"
          aria-label="Pet the cat"
          onClick={petCat}
          onPointerEnter={() => sceneRef.current?.noticeCat()}
          className="group absolute cursor-pointer rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-[#e8b27d]/80"
          style={catBox}
        >
          {catSay && (
            <span
              role="status"
              className={`pointer-events-none absolute bottom-full left-[62%] z-10 mb-2 w-max max-w-[240px] origin-bottom-left rounded-2xl rounded-bl-sm border-2 border-[#2a1a10] bg-[#fbf1d2] px-3 py-2 text-left text-sm font-semibold leading-snug text-[#2a1a10] shadow-[0_8px_24px_-8px_rgba(0,0,0,0.7)] transition duration-500 ${
                catSay.show ? 'scale-100 opacity-100' : 'translate-y-1 scale-95 opacity-0'
              } motion-safe:animate-[chill-pop_0.35s_ease-out]`}
            >
              {catSay.text} 🐾
            </span>
          )}
          <span
            aria-hidden
            className={`pointer-events-none absolute bottom-full left-[68%] mb-1 flex items-center gap-1.5 whitespace-nowrap rounded-md border border-[#e8b27d]/40 bg-black/60 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[#f3cfa8] backdrop-blur transition-opacity duration-500 motion-safe:animate-[chill-bob_2.4s_ease-in-out_infinite] sm:text-[11px] ${
              catSay ? 'opacity-0' : catHint && !hideUi ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100'
            }`}
            style={{transform: 'translate(-50%, 0)'}}
          >
            <PawIcon />
            Pet me
            <span className="absolute left-1/2 top-full -ml-1 border-x-4 border-t-4 border-x-transparent border-t-black/60" />
          </span>
        </button>
      )}

      {/* Cuốn sổ trên bàn: mở Wishlist (lối vào thứ 2, cạnh nút pill) */}
      {bookBox && (
        <button
          type="button"
          aria-label="Open the café wishlist"
          onClick={() => {
            setPanelOpen(false)
            setChatOpen(false)
            setWishOpen(true)
          }}
          className="group absolute cursor-pointer rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-[#e8b27d]/80"
          style={bookBox}
        >
          <span
            aria-hidden
            className="pointer-events-none absolute bottom-full left-1/2 mb-1 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-md border border-[#e8b27d]/40 bg-black/60 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[#f3cfa8] opacity-0 backdrop-blur transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 sm:text-[11px]"
          >
            💡 Wishlist
          </span>
        </button>
      )}

      {/* Lọ tip trên bàn: mở bảng cảm ơn (tên người đã mời Bin cà phê) */}
      {jarBox && (
        <button
          type="button"
          aria-label={`Tip jar — thank-you board${board?.cups ? `, ${board.cups} coffees` : ''}`}
          aria-expanded={boardOpen}
          aria-controls="chill-board"
          onClick={openBoard}
          className="group absolute cursor-pointer rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[#e8b27d]/80"
          style={jarBox}
        >
          <span
            aria-hidden
            className="pointer-events-none absolute bottom-full left-1/2 mb-1 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-md border border-[#e8b27d]/40 bg-black/60 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[#f3cfa8] opacity-0 backdrop-blur transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 sm:text-[11px]"
          >
            🫙 Thank-you board{board?.cups ? ` · ${board.cups}` : ''}
          </span>
        </button>
      )}

      {/* Thanh trên: về trang chủ + điểm đến, giờ + nút cảnh */}
      <div
        {...hoverProps}
        className={`absolute inset-x-0 top-0 flex items-start justify-between gap-3 bg-gradient-to-b from-black/55 to-transparent p-3 pb-10 sm:p-5 sm:pb-14 ${fade}`}
      >
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Link
            href="/"
            className="flex h-9 items-center gap-1.5 rounded-md bg-black/45 px-2.5 text-xs text-white/90 backdrop-blur transition hover:bg-black/65 focus-visible:outline-2 focus-visible:outline-[#e8b27d]"
          >
            <ArrowIcon dir="left" />
            Bin Nguyen
          </Link>
          {[dest.name, weatherLabel, timeLabel].map((label, i) => (
            <span
              key={label}
              className={`${i > 0 ? 'hidden sm:flex' : 'flex'} pointer-events-none h-9 items-center rounded-md bg-black/45 px-2.5 font-mono text-[10px] uppercase tracking-[0.18em] text-white/90 backdrop-blur sm:text-[11px]`}
            >
              {label}
            </span>
          ))}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {/* Bàn nhóm (thử nghiệm) — Studio tắt thì không hiện gì */}
          <GroupTable visible={theme === 'cafe'} onTable={onTable} />
          <ShareButton />
          {updates.length > 0 && (
            <WhatsNewButton
              dot={updatesSeen.dot}
              toast={updatesSeen.toast}
              latest={updates[0]}
              open={updatesOpen}
              onOpen={openUpdates}
              onCloseToast={updatesSeen.closeToast}
              onHoldToast={updatesSeen.holdToast}
            />
          )}
          <span className="pointer-events-none flex h-9 items-center rounded-md bg-black/45 px-2.5 font-mono text-[11px] tabular-nums text-white/90 backdrop-blur">
            {clock}
          </span>
          <StageButton label={scenePaused ? 'Resume scene' : 'Pause scene'} onClick={() => setScenePaused((p) => !p)}>
            {scenePaused ? <PlayIcon small /> : <PauseIcon small />}
          </StageButton>
          {canFullscreen && (
            <StageButton label={fullscreen ? 'Exit fullscreen (F)' : 'Fullscreen (F)'} onClick={toggleFullscreen}>
              {fullscreen ? <ExitFullscreenIcon /> : <FullscreenIcon />}
            </StageButton>
          )}
        </div>
      </div>

      {/* Nền tối sau bảng cảm ơn / nhật ký — bấm ra ngoài để đóng */}
      <button
        type="button"
        aria-label={updatesOpen ? 'Close updates' : 'Close thank-you board'}
        tabIndex={-1}
        onClick={() => {
          setBoardOpen(false)
          setUpdatesOpen(false)
        }}
        className={`absolute inset-0 z-30 cursor-default bg-black/55 backdrop-blur-[2px] transition-opacity duration-300 ${
          boardOpen || updatesOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      {/* Bấm ra ngoài để đóng bảng cài đặt */}
      {panelOpen && (
        <button type="button" aria-label="Close settings" onClick={() => setPanelOpen(false)} className="absolute inset-0 z-10 cursor-default" />
      )}

      {/* Dock nhạc nổi phía dưới */}
      <div
        className={`absolute inset-x-0 bottom-0 z-20 flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] transition-[padding] duration-300 sm:px-5 sm:pb-5 ${
          panelOpen ? 'sm:pr-[436px]' : wishOpen || chatOpen ? 'lg:pr-[450px]' : ''
        } ${fade}`}
      >
        <div
          {...hoverProps}
          className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#16131a]/80 p-3 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.8)] backdrop-blur-md sm:px-4"
        >
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
              <RoundButton label="Previous track (P)" onClick={prev}>
                <PrevIcon />
              </RoundButton>
              <button
                type="button"
                onClick={togglePlay}
                aria-label={playing ? 'Pause' : 'Play'}
                title={`${playing ? 'Pause' : 'Play'} (Space)`}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-[#e8b27d] text-[#2a1a10] transition hover:bg-[#f0c294] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e8b27d]"
              >
                {playing ? <PauseIcon /> : <PlayIcon />}
              </button>
              <RoundButton label="Next track (N)" onClick={next}>
                <NextIcon />
              </RoundButton>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-mono text-[10px] uppercase tracking-[0.2em] text-[#a79e94]">
                {stationLabel} · {stationPos + 1}/{stationList.length}
              </p>
              <p className="truncate font-semibold">{track.title}</p>
            </div>
            <Visualizer audioRef={audioRef} playing={playing} />
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              aria-label="Volume"
              className="hidden w-24 accent-[#e8b27d] md:block"
            />
            {/* Điện thoại không đủ chỗ cho thanh volume — nút loa mở thanh trượt nổi phía trên */}
            <div className="relative md:hidden">
              <button
                type="button"
                onClick={() => setVolumeOpen((o) => !o)}
                aria-label="Volume"
                aria-expanded={volumeOpen}
                aria-controls="chill-volume"
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition ${
                  volumeOpen ? 'border-[#e8b27d]/60 bg-[#e8b27d]/15 text-[#f3cfa8]' : 'border-white/10 text-[#ede6dd] hover:bg-white/[0.06]'
                }`}
              >
                <VolumeIcon muted={volume === 0} />
              </button>
              {volumeOpen && (
                <div
                  id="chill-volume"
                  className="absolute bottom-full right-0 mb-3 flex w-56 items-center gap-3 rounded-xl border border-white/10 bg-[#16131a]/95 px-4 py-3 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.8)] backdrop-blur-md"
                >
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={volume}
                    onChange={(e) => setVolume(Number(e.target.value))}
                    aria-label="Volume"
                    className="w-full accent-[#e8b27d]"
                  />
                  <span className="w-8 shrink-0 text-right font-mono text-[11px] tabular-nums text-[#a79e94]">{Math.round(volume * 100)}</span>
                </div>
              )}
            </div>
            {/* Người chưa mở cài đặt lần nào thấy vòng cam + gợi ý */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => {
                  setVolumeOpen(false)
                  setWishOpen(false)
                  setChatOpen(false)
                  setPanelOpen((o) => !o)
                }}
                aria-label="Settings"
                aria-expanded={panelOpen}
                aria-controls="chill-panel"
                aria-describedby={showHintTip ? 'chill-settings-hint' : undefined}
                title="Settings (S)"
                className={`relative flex h-10 w-10 items-center justify-center rounded-full border transition ${
                  panelOpen || settingsGlow
                    ? 'border-[#e8b27d]/60 bg-[#e8b27d]/15 text-[#f3cfa8]'
                    : 'border-white/10 text-[#ede6dd] hover:bg-white/[0.06]'
                }`}
              >
                {settingsGlow && <span aria-hidden className="chill-ring pointer-events-none absolute inset-0 rounded-full border-2 border-[#e8b27d]" />}
                <SlidersIcon />
              </button>
              {showHintTip && (
                <button
                  id="chill-settings-hint"
                  type="button"
                  onClick={() => {
                    setVolumeOpen(false)
                    setPanelOpen(true)
                  }}
                  className="absolute bottom-full right-0 mb-3 whitespace-nowrap rounded-lg bg-[#e8b27d] px-3 py-2 text-xs font-semibold text-[#2a1a10] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.8)] motion-safe:animate-[chill-pop_0.35s_ease-out] after:absolute after:right-4 after:top-full after:border-[6px] after:border-transparent after:border-t-[#e8b27d] after:content-['']"
                >
                  Đổi nhạc, phòng, thời tiết ở đây
                </button>
              )}
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2 font-mono text-[10px] tabular-nums text-[#a79e94]">
            <span className="w-8">{formatTime(position)}</span>
            <div
              role="slider"
              tabIndex={-1}
              aria-label="Seek"
              aria-valuemin={0}
              aria-valuemax={Math.round(duration)}
              aria-valuenow={Math.round(position)}
              onClick={seek}
              className="relative h-3 flex-1 cursor-pointer"
            >
              <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-white/10" />
              <div className="absolute left-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-[#e8b27d]" style={{width: `${progress * 100}%`}} />
            </div>
            <span className="w-8 text-right">{formatTime(duration)}</span>
          </div>
        </div>
      </div>

      <Wishlist
        open={wishOpen}
        onOpenChange={(o) => {
          if (o) {
            setPanelOpen(false)
            setBoardOpen(false)
            setUpdatesOpen(false)
            setChatOpen(false)
          }
          setWishOpen(o)
        }}
        dimmed={hideUi}
        hidden={panelOpen || volumeOpen || showHintTip}
        stacked={chatAvailable}
        context={`${dest.name} · ${timeLabel} · ${weatherLabel} · ${track.title}`}
        onThanks={thankCat}
        donateRequest={donateRequest}
      />

      <ChillChat
        open={chatOpen}
        onOpenChange={(o) => {
          if (o) {
            setPanelOpen(false)
            setWishOpen(false)
          }
          setChatOpen(o)
        }}
        hidden={panelOpen || volumeOpen || showHintTip}
        dimmed={hideUi}
        onAvailable={setChatAvailable}
      />

      <SupporterBoard
        open={boardOpen}
        onClose={() => setBoardOpen(false)}
        board={board}
        myCup={myCup}
        onDonate={() => {
          setBoardOpen(false)
          setWishOpen(true)
          setDonateRequest((n) => n + 1)
        }}
      />

      <Changelog
        open={updatesOpen}
        onClose={() => setUpdatesOpen(false)}
        updates={updates}
        unseen={updatesSeen.unseen}
        onAction={runAction}
      />

      {/* Bảng cài đặt: sheet trượt lên trên điện thoại, drawer bên phải trên desktop.
          Chia 3 tab (Music · Scene · Atmosphere) để mỗi tab vừa 1 màn hình, không phải cuộn dài */}
      <aside
        id="chill-panel"
        aria-label="Chill settings"
        inert={!panelOpen}
        className={`absolute inset-x-0 bottom-0 z-30 flex h-[75dvh] flex-col rounded-t-2xl border-t border-white/10 bg-[#16131a]/95 backdrop-blur-md transition-transform duration-300 ease-out sm:inset-x-auto sm:inset-y-0 sm:right-0 sm:h-auto sm:w-[420px] sm:rounded-none sm:border-l sm:border-t-0 ${
          panelOpen ? 'translate-x-0 translate-y-0' : 'translate-y-full sm:translate-x-full sm:translate-y-0'
        }`}
      >
        <div className="flex items-center justify-between gap-4 px-5 pb-3 pt-4">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-[#e8b27d]">Chill for work</p>
          <RoundButton label="Close settings (Esc)" onClick={() => setPanelOpen(false)}>
            <CloseIcon />
          </RoundButton>
        </div>

        {/* Tab chính kiểu gạch chân — khác hẳn chip chọn trạm nhạc bên trong tab Music */}
        <div
          role="tablist"
          aria-label="Settings"
          className="grid grid-cols-3 border-b border-white/[0.08] px-3"
          onKeyDown={(e) => {
            if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
            e.preventDefault()
            const i = PANEL_TABS.findIndex((t) => t.id === panelTab)
            const nextTab = PANEL_TABS[(i + (e.key === 'ArrowRight' ? 1 : -1) + PANEL_TABS.length) % PANEL_TABS.length]
            setPanelTab(nextTab.id)
            document.getElementById(`chill-tab-${nextTab.id}`)?.focus()
          }}
        >
          {PANEL_TABS.map((t) => {
            const on = t.id === panelTab
            return (
              <button
                key={t.id}
                id={`chill-tab-${t.id}`}
                type="button"
                role="tab"
                aria-selected={on}
                aria-controls={`chill-tabpanel-${t.id}`}
                tabIndex={on ? 0 : -1}
                onClick={() => setPanelTab(t.id)}
                className={`relative flex min-w-0 items-center justify-center gap-2 px-2 py-3 text-sm transition focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#e8b27d] ${
                  on ? 'font-semibold text-[#f3cfa8]' : 'text-[#a79e94] hover:text-[#ede6dd]'
                }`}
              >
                {t.icon}
                <span className="truncate">{t.label}</span>
                <span
                  aria-hidden
                  className={`absolute inset-x-3 -bottom-px h-0.5 rounded-full transition ${on ? 'bg-[#e8b27d]' : 'bg-transparent'}`}
                />
              </button>
            )
          })}
        </div>

        <div
          id={`chill-tabpanel-${panelTab}`}
          role="tabpanel"
          aria-labelledby={`chill-tab-${panelTab}`}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5"
        >
          {panelTab === 'music' && (
            <>
              {/* Trạm nhạc theo mood — mỗi trạm phát liền mạch như 1 bản mix */}
              <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Music station">
                {STATIONS.map((st) => {
                  const count = tracks.filter((t) => stationOf(t) === st.id).length
                  const on = st.id === station
                  return (
                    <button
                      key={st.id}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      disabled={count === 0}
                      onClick={() => changeStation(st.id)}
                      className={`rounded-full border px-3 py-1.5 text-[13px] transition disabled:cursor-not-allowed disabled:opacity-35 ${
                        on
                          ? 'border-[#e8b27d]/60 bg-[#e8b27d]/15 text-[#f3cfa8]'
                          : 'border-white/10 text-[#a79e94] hover:border-white/25 hover:text-[#ede6dd]'
                      }`}
                    >
                      {st.short}
                    </button>
                  )
                })}
              </div>

              {/* Volume nằm trên thanh phát nhạc (desktop: thanh trượt, điện thoại: nút loa) */}
              <div className="mt-4 flex items-center justify-end">
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

              <ol className="mt-3 divide-y divide-white/[0.06] border-t border-white/[0.06]">
                {stationList.map(({t, i}, pos) => {
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
                          {active && playing ? <EqualizerIcon /> : String(pos + 1).padStart(2, '0')}
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
            </>
          )}

          {panelTab === 'scene' && (
            <div className="space-y-8">
              {/* Căn phòng người xem ngồi — phố, giờ, thời tiết bên ngoài giữ nguyên */}
              <section>
                <SectionTitle index="01" title="Room" />
                <div className="mt-3 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Room">
                  {THEMES.map((t) => {
                    const active = t.id === theme
                    return (
                      <button
                        key={t.id}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => setTheme(t.id)}
                        className={`group overflow-hidden rounded-xl border text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e8b27d] ${
                          active ? 'border-[#e8b27d]/70 ring-1 ring-[#e8b27d]/40' : 'border-white/10 hover:border-white/25'
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element -- ảnh nội thất nhỏ, đã có sẵn */}
                        <img
                          src={t.thumb}
                          alt=""
                          loading="lazy"
                          className={`aspect-video w-full object-cover [image-rendering:pixelated] transition duration-300 ${active ? '' : 'opacity-70 group-hover:opacity-100'}`}
                        />
                        <span className="block truncate px-2 py-1.5 text-xs font-semibold text-[#ede6dd]">{t.name}</span>
                      </button>
                    )
                  })}
                </div>
              </section>

              <section>
                <SectionTitle index="02" title="Destination" />
                {/* Chọn điểm đến bằng thẻ có ảnh phố (đúng giờ đang chọn) thay cho <select> gốc */}
                <div className="mt-3 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Destination">
                  {destinations.map((d, i) => {
                    const active = i === destIndex
                    return (
                      <button
                        key={d.id}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => goTo(i)}
                        className={`group relative overflow-hidden rounded-xl border text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e8b27d] ${
                          active ? 'border-[#e8b27d]/70 ring-1 ring-[#e8b27d]/40' : 'border-white/10 hover:border-white/25'
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element -- ảnh phố đã tải sẵn cho canvas, dùng lại cho nhanh */}
                        <img
                          src={d.streets[time]}
                          alt=""
                          loading="lazy"
                          className={`aspect-video w-full object-cover [image-rendering:pixelated] transition duration-300 ${active ? '' : 'opacity-70 group-hover:opacity-100'}`}
                        />
                        {active && (
                          <span className="absolute right-1.5 top-1.5 rounded bg-[#e8b27d] px-1 font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-[#2a1a10]">
                            Now
                          </span>
                        )}
                        <span className="block truncate px-2 py-1.5 text-xs font-semibold text-[#ede6dd]">{d.name}</span>
                      </button>
                    )
                  })}
                </div>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <span id="chill-travel" className="text-sm text-[#a79e94]">
                    Auto travel
                  </span>
                  <div role="radiogroup" aria-labelledby="chill-travel" className="flex rounded-full border border-white/10 bg-black/20 p-0.5">
                    {TRAVEL_OPTIONS.map((o) => (
                      <button
                        key={o.value}
                        type="button"
                        role="radio"
                        aria-checked={travel === o.value}
                        onClick={() => {
                          setTravel(o.value)
                          travelRef.current = 0
                          setTravelElapsed(0)
                        }}
                        className={`rounded-full px-3 py-1 text-xs transition focus-visible:outline-2 focus-visible:outline-[#e8b27d] ${
                          travel === o.value ? 'bg-[#e8b27d] font-semibold text-[#2a1a10]' : 'text-[#c9c0b6] hover:text-[#ede6dd]'
                        }`}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
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
            </div>
          )}

          {panelTab === 'atmosphere' && (
            <div className="space-y-4">
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
                  <span className="w-28 shrink-0 text-right text-xs text-[#a79e94]">{AMBIENCE_FOR[weather].label}</span>
                </div>
              </Field>
            </div>
          )}
        </div>

        {/* Đáy cố định: phím tắt (desktop) + credit */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-white/[0.06] px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] font-mono text-[11px] text-[#a79e94]">
          {[
            ['Space', 'Play'],
            ['N / P', 'Next / prev'],
            ['F', 'Fullscreen'],
            ['S', 'Settings'],
          ].map(([key, label]) => (
            <span key={key} className="hidden sm:inline">
              <kbd className="rounded border border-white/15 px-1.5 py-0.5 text-[#ede6dd]">{key}</kbd> {label}
            </span>
          ))}
          <span className="uppercase tracking-[0.2em] text-white/30 sm:basis-full">No rush. Just coffee. · Art &amp; music made with AI.</span>
        </div>
      </aside>
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

function ExitFullscreenIcon() {
  return (
    <svg {...iconProps} width={14} height={14}>
      <path d="M3 8h5V3M16 3v5h5M21 16h-5v5M8 21v-5H3" />
    </svg>
  )
}

function SlidersIcon() {
  return (
    <svg {...iconProps}>
      <path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" />
      <circle cx="16" cy="6" r="2" />
      <circle cx="10" cy="12" r="2" />
      <circle cx="18" cy="18" r="2" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg {...iconProps}>
      <path d="M18 6 6 18M6 6l12 12" />
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

function VolumeIcon({muted}: {muted: boolean}) {
  return (
    <svg {...iconProps}>
      <path d="M11 5 6 9H2v6h4l5 4V5Z" />
      {muted ? <path d="m22 9-6 6M16 9l6 6" /> : <path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14" />}
    </svg>
  )
}

function MusicIcon() {
  return (
    <svg {...iconProps}>
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  )
}

function MapIcon() {
  return (
    <svg {...iconProps}>
      <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </svg>
  )
}

function CloudIcon() {
  return (
    <svg {...iconProps}>
      <path d="M17.5 19H7a5 5 0 1 1 1-9.9A6 6 0 0 1 19.5 11 4 4 0 0 1 17.5 19Z" />
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

function PawIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <ellipse cx="8" cy="11" rx="3.6" ry="3" />
      <circle cx="3.4" cy="6.6" r="1.6" />
      <circle cx="6.2" cy="3.8" r="1.6" />
      <circle cx="9.8" cy="3.8" r="1.6" />
      <circle cx="12.6" cy="6.6" r="1.6" />
    </svg>
  )
}
