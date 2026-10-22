'use client'

import Link from 'next/link'
import {useCallback, useEffect, useLayoutEffect, useRef, useState} from 'react'
import {ChillAudio, type Ambience} from './audio'
import {ChillScene, SCENE_H, SCENE_W, type GroupWall, type TimeOfDay, type Weather} from './scene'
import {DESTINATIONS, type Destination} from './destinations'
import {STATIONS, TRACKS, stationOf, type StationId, type Track} from './tracks'
import {trackEvent} from '@/lib/analytics'
import {Wishlist} from './Wishlist'
import {Diary} from './Diary'
import {ShareButton, shareChill} from './ShareButton'
import {GroupTable} from './GroupTable'
import {arrangeFriends, type TableMember} from './table-view'
import {SupporterBoard, type Board} from './SupporterBoard'
import {hasDonate, loadCup} from './donate-config'
import {SEATS, THEMES, hasGirl, themeById, type Seat, type ThemeId} from './themes'
import {Changelog, WhatsNewButton, useUpdatesSeen, type ChillUpdate} from './Changelog'
import {ChillChat, type ChatMessage} from './ChillChat'
import {setLang, useLang, useT, type Lang} from './i18n'
import {DRINKS, chooseDrink, useDrink, type Drink} from './drink'
import {GUIDE_FIRST_MS, GUIDE_GAP_MS, GUIDE_HOLD_MS, GUIDE_ORDER, GUIDE_PER_VISIT, GUIDE_POINT_MS, GUIDE_SHOW_MS, loadTried, saveTried, type GuideStep} from './guide'
import {PixelGlass} from './pixel-icons'
import {Shelf} from './ShelfBook'
import {useChillApp, useInstall} from './install'
import {MIX_CHANNELS, MIX_PRESETS, SILENT, parseMix, presetOf, sceneMix, type Mix, type MixChannel, type MixPreset} from './mix'
import {addItem, loadShelf, markSeen, pickGift, toggleShown, type ShelfState} from './shelf'
import {Focus} from './Focus'
import {MiniPlayer, canMiniPlayer, openMiniWindow} from './MiniPlayer'
import {QuestCard} from './QuestCard'
import {NameField} from './NameField'
import {loadMe, onMeChange} from './identity'
import type {QuestState} from './quest-shared'
import {BookSparkles, TodayBook} from './TodayBook'
import {addPhin, levelOf, loadRegular, stampToday, streakOf, visitDayOf, type Regular} from './regular'

const PREFS_KEY = 'chill:prefs'
// Đã từng bấm vào mèo → thôi hiện bong bóng gợi ý
const CAT_PETTED_KEY = 'chill:cat-petted'
// Đã mở bảng cài đặt lần nào chưa — chưa thì nút Settings sáng lên + gợi ý
const SETTINGS_SEEN_KEY = 'chill:settings-seen'
// Đã bật Zen lần nào chưa (chưa → công tắc có chấm cam + vòng sáng), đã hiện gợi ý chưa
const ZEN_SEEN_KEY = 'chill:zen-seen'
// Từ ngần này người (tính cả mình) mới nêu số người đang ở quán
const MIN_ONLINE_SHOWN = 2
const ZEN_HINT_KEY = 'chill:zen-hint'
const ZEN_HINT_DELAY_MS = 4000
const ZEN_HINT_MS = 9000
// Vách kính (bàn nhóm): đã thử đổi tường lần nào chưa (chưa → chấm cam ở tab Atmosphere
// khi đang ngồi bàn), đã hiện bong bóng gợi ý trong cảnh bàn nhóm chưa
const WALL_SEEN_KEY = 'chill:wall-seen'
const WALL_HINT_KEY = 'chill:wall-hint'
const WALL_HINT_DELAY_MS = 1600
const WALL_HINT_MS = 9000
// Gợi ý hiện sau khi bấm Play bao lâu, và tự ẩn sau bao lâu
// Mèo nói cảm ơn (t.room.catThanks) sau khi người xem bấm "I've sent it" ở mục donate
const CAT_SAY_MS = 4500
// Giữ tay trên mèo bao lâu thì tính là vuốt ve (gừ gừ) thay vì 1 cú chạm
const CAT_HOLD_MS = 350
// Mèo chơi cần câu tới hết sức thì ngủ bù chừng này mới chơi tiếp
const TOY_REST_MS = 20_000
const TOY_TIP_MS = 3500
// Đã cầm cần câu lần nào chưa (chưa → sao lấp lánh quanh cần câu tới khi cầm, nhãn "Trêu
// mèo" tự hiện một lúc, mèo liếc sang — cần câu mảnh, chìm vào khung cửa, khách không tự thấy)
const TOY_SEEN_KEY = 'chill:toy-seen'
const TOY_HINT_DELAY_MS = 3000
const TOY_HINT_MS = 6000
// Lần ghé trước (ms) — để biết khách quay lại sau bao lâu (event Chill Visit)
const LAST_VISIT_KEY = 'chill:last-visit'
// Đã mở cuốn sổ "Việc hôm nay" trên quầy lần nào chưa (chưa → sao lấp lánh + nhãn gợi ý)
const BOOK_SEEN_KEY = 'chill:book-seen'
// Nhãn gợi ý cạnh cuốn sổ cho khách chưa mở: hiện sau khi vào quán bấy lâu, rồi tự tắt
const BOOK_TIP_DELAY_MS = 4000
const BOOK_TIP_MS = 9000

// Nguồn khách cho event Chill Visit: ?ref= (vd yt, ext), không có thì utm_source
function visitRef() {
  const p = new URLSearchParams(window.location.search)
  const raw = (p.get('ref') || p.get('utm_source') || '').toLowerCase()
  return raw.replace(/[^a-z0-9._-]/g, '').slice(0, 32) || 'none'
}
// Mốc phút đã nghe nhạc trong 1 lần mở trang (event Chill Listen)
const LISTEN_MINUTES = [1, 5, 15, 30, 60]
// Lượt nghe: phát đủ 30 giây mới tính (như Spotify); dưới 50 lượt thì chưa hiện số
const PLAY_COUNT_MS = 30_000
const PLAY_COUNT_SHOW = 50
// Thử thách chung: mã máy, phin đã góp / phiếu đã bỏ trong mùa (theo mã mùa)
const QUEST_UID_KEY = 'chill:quest-uid'
const QUEST_MINE_KEY = 'chill:quest-mine'
const QUEST_VOTE_KEY = 'chill:quest-vote'

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Chặn storage — thử thách vẫn chạy, chỉ không nhớ được số phin của mình
  }
}
// Mốc phút ngồi ở 1 cảnh (event Chill Stay) — dưới 5 phút coi như đang lướt xem
const STAY_MINUTES = [5, 15, 30, 60]
// Màn dọc: đã kéo ngang cảnh lần nào chưa (chưa → gợi ý "kéo để nhìn quanh")
const PAN_SEEN_KEY = 'chill:pan-seen'
const PAN_HINT_DELAY_MS = 1500
const PAN_HINT_MS = 8000
// Mèo chào khách quen sau khi vào quán bao lâu
const CAT_GREET_DELAY_MS = 2500
// Không đụng chuột/phím bao lâu thì giấu giao diện
const IDLE_MS = 3500
// Điện thoại: hàng thông tin dưới thanh trên là chữ trơn, các mục cách nhau bằng dấu chấm giữa
const INFO_ROW =
  'max-sm:text-white/65 max-sm:[&>span]:h-auto max-sm:[&>span]:rounded-none max-sm:[&>span]:bg-transparent max-sm:[&>span]:px-0 max-sm:[&>span]:text-inherit max-sm:[&>span]:backdrop-blur-none max-sm:[&>span+span]:before:mr-2 max-sm:[&>span+span]:before:content-["·"]'

type Box = {left: number; top: number; width: number; height: number}

type Prefs = {
  trackId: string
  volume: number
  ambience: number
  // Bản trộn âm nền riêng (mix.ts); null / chưa có = theo cảnh
  mix?: Mix | null
  time: TimeOfDay
  weather: Weather
  shuffle: boolean
  station: StationId
  destination: string
  travel: number
  theme: ThemeId
  // Người ngồi nam / nữ (chỉ dùng khi Studio bật seatPickOpen)
  seat?: Seat
  panelTab: PanelTab
  zen: boolean
  groupWall: GroupWall
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

// Phía sau bàn nhóm (chỉ quán cà phê có bàn nhóm)
const WALLS: {value: GroupWall; label: string; icon: React.ReactNode}[] = [
  {value: 'brick', label: 'Brick', icon: <BrickIcon />},
  {value: 'glass', label: 'Glass', icon: <GlassIcon />},
]

const MIX_ICONS: Record<MixChannel, string> = {rain: '🌧', street: '🛵', cafe: '☕', purr: '🐱'}

const AMBIENCE_FOR: Record<Weather, {kind: Ambience; label: string}> = {
  clear: {kind: 'street', label: 'Street sounds'},
  rain: {kind: 'rain', label: 'Rain on the awning'},
  mist: {kind: 'quiet', label: 'Quiet room'},
}

// 846 · 1.2k (en) / 1,2k (vi)
function formatPlays(n: number, lang: Lang) {
  if (n < 1000) return String(n)
  const k = (Math.floor(n / 100) / 10).toFixed(n < 10_000 ? 1 : 0).replace(/\.0$/, '')
  return `${lang === 'vi' ? k.replace('.', ',') : k}k`
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
  shelfOn = false,
  playCountsOn = false,
  questOn = false,
  catToyOn = false,
  seatPickOn = false,
  streetMotionOn = false,
  miniPlayerOn = false,
}: {
  tracks?: Track[]
  destinations?: Destination[]
  updates?: ChillUpdate[]
  // Kệ sưu tầm (Studio "Chill · Cài đặt"), mặc định tắt
  shelfOn?: boolean
  // Lượt nghe từng bài (Studio "Chill · Cài đặt"), mặc định tắt
  playCountsOn?: boolean
  // Thử thách chung "Cả quán cùng pha phin" (Studio "Chill · Cài đặt"), mặc định tắt
  questOn?: boolean
  // Cần câu lông vũ trêu mèo (Studio "Chill · Cài đặt"), mặc định tắt
  catToyOn?: boolean
  // Khách chọn người ngồi nam / nữ (Studio "Chill · Cài đặt"), mặc định tắt = luôn nam
  seatPickOn?: boolean
  // Người, xe, chó ngoài phố chuyển động mượt (Studio "Chill · Cài đặt"), mặc định tắt.
  // ?motion=1 / ?motion=0 trên URL ghi đè để so trước / sau
  streetMotionOn?: boolean
  // Thu nhỏ quán thành cửa sổ nổi (Document PiP) + tên trạm / ảnh / tua trên màn hình khoá
  // (Studio "Chill · Cài đặt"), mặc định tắt. ?mini=1 / ?mini=0 trên URL ghi đè
  miniPlayerOn?: boolean
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // Khung chứa cảnh. Màn dọc: khung nằm giữa thanh trên và thanh nhạc; cảnh phóng to cho
  // cao bằng khung (cắt 2 bên) và kéo ngang được. zoom = đã phóng to · pan = 0 (mép trái)
  // … 1 (mép phải, chỗ người ngồi) · panMax = quãng kéo tối đa mỗi bên (px)
  const wrapRef = useRef<HTMLDivElement>(null)
  const zoomRef = useRef(false)
  const panRef = useRef(1)
  const panMaxRef = useRef(0)
  const dragRef = useRef<{id: number; x: number; pan: number} | null>(null)
  const dragRaf = useRef(0)
  const sceneRef = useRef<ChillScene | null>(null)
  const audioRef = useRef<ChillAudio | null>(null)
  const scenePausedRef = useRef(false)
  // Vẽ 1 khung cảnh (giới hạn ~30fps, true = vừa vẽ) — vòng lặp của trang hoặc của cửa sổ nổi gọi
  const drawRef = useRef<(now: number) => boolean>(() => false)
  // Cửa sổ nổi đang mở thì nó giữ nhịp vẽ (rAF của tab gốc đứng khi tab bị ẩn)
  const miniRef = useRef(false)
  // Tính lại vùng bấm (mèo, cuốn sổ) — gán trong effect dựng cảnh
  const fitRef = useRef<() => void>(() => {})
  // Toạ độ màn hình (clientX/Y) → px gốc 640×360 của cảnh — tính lại mỗi lần `fit`
  const toSceneRef = useRef<(x: number, y: number) => {x: number; y: number}>((x, y) => ({x, y}))
  const t = useT()
  const lang = useLang()

  const [loaded, setLoaded] = useState(false)
  const [time, setTime] = useState<TimeOfDay>('morning')
  const [weather, setWeather] = useState<Weather>('clear')
  const [index, setIndex] = useState(0)
  const [started, setStarted] = useState(false)
  // Màn chào: chưa "bước vào quán" thì chỉ có cảnh + 1 nút lớn, mọi nút khác ẩn
  const [entered, setEntered] = useState(false)
  const [welcomeGone, setWelcomeGone] = useState(false)
  const startFrom = useRef<'welcome' | 'player'>('player')
  const startTracked = useRef(false)
  const [canPan, setCanPan] = useState(false)
  const [panSeen, setPanSeen] = useState(true)
  const [panHint, setPanHint] = useState(false)
  // Thẻ khách quen + đồng hồ phin
  const [regular, setRegular] = useState<Regular>({days: [], total: 0, phins: 0})
  const stamped = useRef(false)
  const [focusLabel, setFocusLabel] = useState<string | null>(null)
  const [focusOpen, setFocusOpen] = useState(false)
  const visitTracked = useRef(false)
  const [playing, setPlaying] = useState(false)
  const [volume, setVolume] = useState(0.7)
  const [ambience, setAmbience] = useState(0.35)
  const [mix, setMix] = useState<Mix | null>(null)
  // Cài quán thành ứng dụng (install.ts): cách cài của trình duyệt này + hướng dẫn tay đang mở
  const {mode: installMode, install} = useInstall()
  const [installHelp, setInstallHelp] = useState(false)
  useChillApp()
  const [shuffle, setShuffle] = useState(false)
  const [station, setStation] = useState<StationId>('acoustic')
  const [position, setPosition] = useState(0)
  const [duration, setDuration] = useState(tracks[0].duration)
  const [scenePaused, setScenePaused] = useState(false)
  const [clock, setClock] = useState('')
  const [destIndex, setDestIndex] = useState(0)
  const [travel, setTravel] = useState(5)
  const [theme, setTheme] = useState<ThemeId>('cafe')
  // Người ngồi khách chọn; Studio tắt thì cảnh luôn là nam (lựa chọn cũ vẫn giữ trong prefs)
  const [seat, setSeat] = useState<Seat>('boy')
  const shownSeat: Seat = seatPickOn ? seat : 'boy'
  // Chế độ Zen: giấu hết nút, chỉ còn cảnh động + nhạc. Bật / tắt bằng công tắc trên
  // thanh trên (hoặc phím H); trong Zen công tắc chỉ hiện lại khi nhích chuột / chạm
  const [zen, setZen] = useState(false)
  // "Thử ngay" bàn nhóm → mở màn tạo bàn / menu bàn nhóm trong GroupTable
  const [tableSignal, setTableSignal] = useState(0)
  // Tăng 1 = mở bảng đồng hồ phin (nút "Thử ngay" trong Có gì mới)
  const [focusSignal, setFocusSignal] = useState(0)
  // Kệ sưu tầm (shelf.ts): món đã có + đang bày, món mèo vừa mang ra cho phin vừa xong,
  // sổ sưu tầm đang mở + món đang chọn trong sổ, vùng bấm từng món trên kệ
  const [shelf, setShelf] = useState<ShelfState>({owned: [], shown: []})
  const [gift, setGift] = useState<string | null>(null)
  const [shelfOpen, setShelfOpen] = useState(false)
  const [shelfPick, setShelfPick] = useState<string | null>(null)
  const [shelfBoxes, setShelfBoxes] = useState<{id: string; box: Box}[]>([])
  // Ô đầu của kệ — kệ chưa bày món nào thì đây là lối vào kệ (và chỗ lời mời chỉ vào)
  const [shelfStartBox, setShelfStartBox] = useState<Box | null>(null)
  const [panelTab, setPanelTab] = useState<PanelTab>('music')
  const [travelElapsed, setTravelElapsed] = useState(0)
  // Vị trí con mèo trên màn hình (px CSS) để đặt nút bấm + bong bóng gợi ý
  const [catBox, setCatBox] = useState<Box | null>(null)
  // Cần câu lông vũ dựng cạnh mèo: đang cầm (toyOut) · mèo vừa hết sức, ngủ bù (toyRest)
  const [toyBox, setToyBox] = useState<Box | null>(null)
  // Phòng đang cầm cần câu (đổi phòng là cần câu về chỗ dựng của phòng mới)
  const [toyIn, setToyIn] = useState<ThemeId | null>(null)
  const [toyRest, setToyRest] = useState(false)
  // Nhãn "Đung đưa lông vũ · Esc để cất": chỉ hiện chốc lát lúc vừa cầm lên, khỏi che lông vũ
  const [toyTip, setToyTip] = useState(false)
  const [toySeen, setToySeen] = useState(true)
  const [toyHint, setToyHint] = useState(false)
  const toyOutRef = useRef(false)
  const [headBox, setHeadBox] = useState<Box | null>(null)
  const [bookBox, setBookBox] = useState<Box | null>(null)
  const [jarBox, setJarBox] = useState<Box | null>(null)
  // Phin + ly trên quầy: bấm để chọn món, nước trong ly đổi theo (xem drink.ts)
  const [drinkBox, setDrinkBox] = useState<Box | null>(null)
  const [drinkOpen, setDrinkOpen] = useState(false)
  // Phòng này có ly trên quầy không (drinkBox còn là null khi ly nằm ngoài khung ở màn dọc)
  const [hasGlass, setHasGlass] = useState(false)
  const drinkRef = useRef<HTMLDivElement>(null)
  const drinkMenuRef = useRef<HTMLDivElement>(null)
  // Ly nằm sát mép màn hình (mobile kéo cảnh) → đẩy bảng chọn món vào trong, mũi tên vẫn chỉ vào ly
  const [drinkShift, setDrinkShift] = useState(0)
  const drink = useDrink()
  // Bàn nhóm (thử nghiệm): thành viên bàn mình đang ngồi + đang xem bàn nhóm hay quầy
  const [tableMembers, setTableMembers] = useState<TableMember[] | null>(null)
  const [groupView, setGroupView] = useState(false)
  // Phía sau bàn nhóm: tường gạch / vách kính (mỗi người tự chọn, lưu trong prefs)
  const [groupWall, setGroupWall] = useState<GroupWall>('brick')
  const [seatBoxes, setSeatBoxes] = useState<(Box | null)[]>([])
  const [moreBox, setMoreBox] = useState<Box | null>(null)
  const [wishOpen, setWishOpen] = useState(false)
  const [todayOpen, setTodayOpen] = useState(false)
  // Mặc định coi như đã mở để khỏi nháy sao lúc hydrate; đọc storage xong mới biết
  const [bookSeen, setBookSeen] = useState(true)
  // Vừa xong 1 phin → sổ lấp lánh lại tới khi khách mở (nhắc gạch việc)
  const [bookNudge, setBookNudge] = useState(false)
  const [bookTip, setBookTip] = useState(false)
  const [diaryOpen, setDiaryOpen] = useState(false)
  // Lọ tip + bảng cảm ơn: số ly Bin đã xác nhận, người đồng ý hiện tên
  const [board, setBoard] = useState<Board | null>(null)
  const [boardOpen, setBoardOpen] = useState(false)
  const [myCup, setMyCup] = useState(false)
  const [donateRequest, setDonateRequest] = useState(0)
  // Nhật ký thay đổi. `returning` = máy này đã từng vào /chill (có prefs từ trước)
  const [updatesOpen, setUpdatesOpen] = useState(false)
  // Phòng chat (góc phải, chung chỗ với Wishlist) — Studio có thể tắt
  const [chatOpen, setChatOpen] = useState(false)
  const [, setChatAvailable] = useState(false)
  // Số người đang ở quán (tính cả mình), lấy từ nhịp "đang ở quán" của phòng chat
  const [online, setOnline] = useState(0)
  // 3 ô của hàng nút góc phải dưới (Wishlist · Mời bạn · Chat)
  const [diarySlot, setDiarySlot] = useState<HTMLDivElement | null>(null)
  const [wishSlot, setWishSlot] = useState<HTMLDivElement | null>(null)
  const [inviteSlot, setInviteSlot] = useState<HTMLDivElement | null>(null)
  const [chatSlot, setChatSlot] = useState<HTMLDivElement | null>(null)
  const [returning, setReturning] = useState<boolean | null>(null)
  const [catPetted, setCatPetted] = useState(true)
  // Bong bóng lời nói của mèo: chờ hiện (khung donate đang che mèo trên điện thoại) → hiện → mờ dần
  const [catSay, setCatSay] = useState<{text: string; show: boolean} | null>(null)
  const catSayQueued = useRef<string | null>(null)
  const catSayTimers = useRef<number[]>([])

  const track = tracks[index]
  // Playlist của trạm đang chọn (index vẫn là vị trí trong toàn bộ `tracks`)
  // `station` chỉ là tab đang xem — bài đang phát giữ nguyên trạm của nó cho tới khi chọn bài khác
  const stationList = tracks.map((tr, i) => ({tr, i})).filter(({tr}) => stationOf(tr) === station)
  const playingStation = stationOf(track)
  const playingList = tracks.filter((tr) => stationOf(tr) === playingStation)
  const playingPos = playingList.indexOf(track)
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
    setMix(parseMix(prefs.mix))
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
    if (SEATS.includes(prefs.seat!)) setSeat(prefs.seat!)
    if (PANEL_TABS.some((t) => t.id === prefs.panelTab)) setPanelTab(prefs.panelTab!)
    if (prefs.zen === true) setZen(true)
    if (prefs.groupWall === 'glass') setGroupWall('glass')
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) setScenePaused(true)
    try {
      setCatPetted(localStorage.getItem(CAT_PETTED_KEY) === '1')
    } catch {
      setCatPetted(false)
    }
    setReturning(hadPrefs)
    setRegular(loadRegular())
    try {
      setPanSeen(localStorage.getItem(PAN_SEEN_KEY) === '1')
    } catch {
      // Chặn storage → không gợi ý
    }
    // Link mời vào bàn nhóm → vào thẳng màn chọn nhân vật, khỏi qua màn chào
    if (new URLSearchParams(window.location.search).has('table')) setEntered(true)
    setLoaded(true)
    /* eslint-enable react-hooks/set-state-in-effect */
    if (!visitTracked.current) {
      visitTracked.current = true
      let visitor: 'new' | 'returning' | 'same-day' | 'within-week' | 'later' = hadPrefs ? 'returning' : 'new'
      try {
        const last = Number(localStorage.getItem(LAST_VISIT_KEY))
        if (last) {
          const days = (Date.now() - last) / 86_400_000
          visitor = days < 1 ? 'same-day' : days < 7 ? 'within-week' : 'later'
        }
        localStorage.setItem(LAST_VISIT_KEY, String(Date.now()))
      } catch {
        // Chặn storage → chỉ biết khách mới / cũ theo prefs
      }
      trackEvent({name: 'Chill Visit', props: {visitor, ref: visitRef()}})
    }
  }, [tracks, destinations])

  useEffect(() => {
    if (!loaded) return
    const prefs: Prefs = {
      trackId: track.id,
      volume,
      ambience,
      mix,
      time,
      weather,
      shuffle,
      station,
      destination: dest.id,
      travel,
      theme,
      seat,
      panelTab,
      zen,
      groupWall,
    }
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
    } catch {
      // Chế độ ẩn danh / chặn storage — bỏ qua, trang vẫn chạy bình thường
    }
  }, [loaded, track.id, volume, ambience, mix, time, weather, shuffle, station, dest.id, travel, theme, seat, panelTab, zen, groupWall])

  // Vòng lặp vẽ cảnh, giới hạn ~30fps cho nhẹ máy
  useEffect(() => {
    const scene = new ChillScene(canvasRef.current!)
    sceneRef.current = scene
    // Tiếng xe chạy qua, còi, chó sủa ngoài phố → phát qua bộ âm thanh (theo thanh Ambience)
    scene.onSound = (kind, pan, dir, len) => audioRef.current?.streetSound(kind, pan, dir, len)
    // ?train=now: gọi tàu tới ngay khi đang ở phố đường tàu (quay clip khỏi phải chờ)
    if (new URLSearchParams(window.location.search).get('train') === 'now') scene.callTrain()
    let raf = 0
    let lastDraw = 0
    scene.frame(performance.now())
    drawRef.current = (now: number) => {
      if (scenePausedRef.current || now - lastDraw < 33) return false
      lastDraw = now
      scene.frame(now)
      return true
    }
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop)
      if (!miniRef.current) drawRef.current(now)
    }
    raf = requestAnimationFrame(loop)
    // Canvas vẽ ở bội số nguyên của 640×360 vừa đủ phủ khung hiển thị (px thiết bị)
    const canvas = canvasRef.current!
    const wrap = wrapRef.current!
    const fit = () => {
      const dpr = window.devicePixelRatio || 1
      const portrait = window.matchMedia('(orientation: portrait)').matches
      const cw = wrap.clientWidth
      const ch = wrap.clientHeight
      const bw = SCENE_W * 2
      const bh = SCENE_H * 2
      // Ngang: cảnh phủ kín khung (object-cover). Dọc: canvas rộng bằng màn hình (thấy trọn
      // cảnh, dùng ở màn chào + bàn nhóm); đã vào quán thì phóng to bằng transform cho cao
      // bằng khung, phần tràn 2 bên kéo ngang để xem
      let k = Math.max(cw / bw, ch / bh)
      let tx = 0
      if (portrait) {
        const k0 = cw / bw
        const kZoom = Math.max(k0, ch / bh)
        k = zoomRef.current ? kZoom : k0
        const maxTx = Math.max(0, (bw * k - cw) / 2)
        tx = (0.5 - panRef.current) * 2 * maxTx
        panMaxRef.current = maxTx
        canvas.style.transform = `translateX(${tx}px) scale(${k / k0})`
        // Luôn giữ độ nét của mức phóng to → lúc phóng không phải cấp lại canvas
        scene.resize(bw * kZoom * dpr, bh * kZoom * dpr)
        setCanPan(maxTx > 0)
      } else {
        panMaxRef.current = 0
        canvas.style.transform = ''
        scene.resize(cw * dpr, ch * dpr)
        setCanPan(false)
      }
      const toBox = (hit: {x: number; y: number; w: number; h: number}): Box | null => {
        const left = wrap.offsetLeft + cw / 2 + tx - (bw * k) / 2 + hit.x * k
        const top = wrap.offsetTop + (ch - bh * k) / 2 + hit.y * k
        return left + hit.w * k < 0 || left > cw ? null : {left, top, width: hit.w * k, height: hit.h * k}
      }
      setCatBox(toBox(scene.catHitBox))
      setToyBox(toBox(scene.toyPropBox))
      toSceneRef.current = (x, y) => {
        const r = wrap.getBoundingClientRect()
        return {x: (x - r.left - cw / 2 - tx + (bw * k) / 2) / k, y: (y - r.top - (ch - bh * k) / 2) / k}
      }
      setHeadBox(toBox(scene.headBox))
      const book = scene.notebookHitBox
      setBookBox(book ? toBox(book) : null)
      setJarBox(hasDonate() ? toBox(scene.tipJarHitBox) : null)
      setShelfBoxes(scene.shelfHitBoxes.flatMap(({id, box}) => {
        const b = toBox(box)
        return b ? [{id, box: b}] : []
      }))
      const slot = scene.shelfFirstSlotBox
      setShelfStartBox(slot ? toBox(slot) : null)
      const glass = scene.drinkHitBox
      setDrinkBox(glass ? toBox(glass) : null)
      setHasGlass(glass !== null)
      setSeatBoxes([0, 1, 2, 3].map((i) => toBox(scene.groupSeatBox(i))))
      setMoreBox(toBox(scene.groupMoreBox))
    }
    fitRef.current = fit
    const ro = new ResizeObserver(fit)
    ro.observe(wrap)
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

  // Người ngồi nam / nữ (phòng chưa có bản nữ thì cảnh tự giữ bản nam)
  useEffect(() => {
    const scene = sceneRef.current
    if (!scene) return
    scene.setSeat(shownSeat)
    scene.frame(performance.now())
  }, [shownSeat])

  useEffect(() => {
    const motion = new URLSearchParams(window.location.search).get('motion')
    sceneRef.current?.setStreetMotion(motion ? motion === '1' : streetMotionOn)
  }, [streetMotionOn])

  // Màn dọc: vào quán rồi thì phóng to cảnh; bàn nhóm cần thấy đủ 4 ghế nên thu về như cũ
  useEffect(() => {
    zoomRef.current = entered && !groupView
    fitRef.current()
  }, [entered, groupView])

  const markPanSeen = () => {
    setPanHint(false)
    if (panSeen) return
    setPanSeen(true)
    try {
      localStorage.setItem(PAN_SEEN_KEY, '1')
    } catch {
      // bỏ qua
    }
  }
  const onPanDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Đang cầm cần câu: kéo ngón tay là đung đưa lông vũ, không lia cảnh
    if (!panMaxRef.current || !zoomRef.current || toyOutRef.current) return
    dragRef.current = {id: e.pointerId, x: e.clientX, pan: panRef.current}
    e.currentTarget.setPointerCapture(e.pointerId)
    // Đang kéo thì cảnh bám theo ngón tay, không chạy hiệu ứng phóng
    if (canvasRef.current) canvasRef.current.style.transition = 'none'
  }
  const onPanMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current
    if (!d || d.id !== e.pointerId || !panMaxRef.current) return
    panRef.current = Math.min(1, Math.max(0, d.pan - (e.clientX - d.x) / (2 * panMaxRef.current)))
    if (!dragRaf.current) {
      dragRaf.current = requestAnimationFrame(() => {
        dragRaf.current = 0
        fitRef.current()
      })
    }
    if (Math.abs(e.clientX - d.x) > 12) markPanSeen()
  }
  const onPanUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.id !== e.pointerId) return
    dragRef.current = null
    if (canvasRef.current) canvasRef.current.style.transition = ''
  }
  // Màn dọc: tự lia cảnh tới 1 chỗ (lời mời chỉ vào thứ đang nằm ngoài khung)
  const panTo = useCallback((hit: {x: number; w: number}) => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    const maxTx = panMaxRef.current
    if (!canvas || !wrap || !maxTx || !zoomRef.current || dragRef.current) return
    // Đưa tâm vùng `hit` (px gốc của cảnh) ra giữa khung, trong giới hạn kéo được
    const f = (hit.x + hit.w / 2) / (SCENE_W * 2) - 0.5
    const to = Math.min(1, Math.max(0, 0.5 + (f * (2 * maxTx + wrap.clientWidth)) / (2 * maxTx)))
    const from = panRef.current
    if (Math.abs(from - to) < 0.05) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      panRef.current = to
      return fitRef.current()
    }
    const t0 = performance.now()
    canvas.style.transition = 'none'
    const step = (now: number) => {
      // Khách tự kéo giữa chừng → nhường
      if (dragRef.current) return
      const p = Math.min(1, (now - t0) / 1100)
      panRef.current = from + (to - from) * (p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2)
      fitRef.current()
      if (p < 1) requestAnimationFrame(step)
      else canvas.style.transition = ''
    }
    requestAnimationFrame(step)
  }, [])

  // Gợi ý kéo ngang: hiện 1 lúc sau khi cảnh phóng xong, tới khi người xem kéo thử
  useEffect(() => {
    if (!canPan || panSeen || !entered || groupView) return
    const on = window.setTimeout(() => setPanHint(true), PAN_HINT_DELAY_MS)
    const off = window.setTimeout(() => setPanHint(false), PAN_HINT_DELAY_MS + PAN_HINT_MS)
    return () => {
      window.clearTimeout(on)
      window.clearTimeout(off)
      setPanHint(false)
    }
  }, [canPan, panSeen, entered, groupView])

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

  // Món khách chọn → nước trong ly dưới phin
  useEffect(() => {
    const scene = sceneRef.current
    if (!scene) return
    scene.setDrink(drink)
    scene.frame(performance.now())
  }, [drink])

  useEffect(() => {
    if (!drinkOpen) return
    const onDown = (e: PointerEvent) => !drinkRef.current?.contains(e.target as Node) && setDrinkOpen(false)
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [drinkOpen])

  useLayoutEffect(() => {
    const anchor = drinkRef.current
    const menu = drinkMenuRef.current
    if (!drinkOpen || !anchor || !menu) return
    const r = anchor.getBoundingClientRect()
    const center = r.left + r.width / 2
    const half = menu.offsetWidth / 2
    const edge = 8
    setDrinkShift(Math.max(edge + half - center, Math.min(0, window.innerWidth - edge - half - center)))
  }, [drinkOpen, drinkBox])

  const pickDrink = (d: Drink) => {
    chooseDrink(d)
    setDrinkOpen(false)
    trackEvent({name: 'Chill Drink', props: {drink: d}})
  }

  // Bàn nhóm: mỗi người bạn đang ở bàn sáng 1 bóng trên dây đèn của quán,
  // bạn bè ngồi vào 4 ghế ở cảnh bàn nhóm
  const onTable = useCallback((members: TableMember[] | null) => {
    setTableMembers(members)
    if (!members) setGroupView(false)
    const scene = sceneRef.current
    if (!scene) return
    scene.setFriendLights(members ? members.filter((m) => !m.you).length : null)
    scene.setSeated(members ? arrangeFriends(members).seated : [])
    scene.frame(performance.now())
  }, [])
  const table = tableMembers ? arrangeFriends(tableMembers) : null

  // Bong bóng lời thoại: bạn cùng bàn vừa nhắn trong phòng chat → tin hiện trên đầu
  // nhân vật của họ ở bàn nhóm ~6 giây, bóng đèn của họ ở quầy nháy sáng. Chỉ tin mới
  // từ lúc mở trang (bỏ qua lịch sử), chỉ của người cùng bàn (khớp mã ẩn danh `who`)
  // ts = lúc nhận (để tự tắt), sent = lúc gửi (để biết tin nào mới nhất)
  const [bubbles, setBubbles] = useState<Record<string, {name: string; text: string; ts: number; sent: number}>>({})
  const lastChatTs = useRef<number | null>(null)
  const membersRef = useRef<TableMember[] | null>(null)
  useEffect(() => {
    membersRef.current = tableMembers
  }, [tableMembers])
  // Bạn cùng bàn đang gõ (mã `who`) → "• • •" trên đầu họ
  const [typingWho, setTypingWho] = useState<string[]>([])
  const onChatMessages = useCallback((messages: ChatMessage[], typing: string[]) => {
    setTypingWho((prev) => (prev.join() === typing.join() ? prev : typing))
    const latest = messages.reduce((t, m) => Math.max(t, m.ts), 0)
    if (lastChatTs.current === null) {
      lastChatTs.current = latest
      return
    }
    const since = lastChatTs.current
    lastChatTs.current = Math.max(since, latest)
    const friends = (membersRef.current ?? []).filter((m) => !m.you)
    const fresh = messages.filter((m) => m.kind === 'msg' && m.ts > since && m.who && friends.some((f) => f.who === m.who))
    if (!fresh.length) return
    setBubbles((prev) => {
      const next = {...prev}
      for (const m of fresh) next[m.who!] = {name: m.name ?? '', text: m.text, ts: Date.now(), sent: m.ts}
      return next
    })
    for (const m of fresh) sceneRef.current?.flashBulb(friends.findIndex((f) => f.who === m.who))
  }, [])
  // Tự tắt sau ~6,5 giây
  useEffect(() => {
    const ids = Object.keys(bubbles)
    if (!ids.length) return
    const t = window.setTimeout(() => {
      const now = Date.now()
      setBubbles((prev) => Object.fromEntries(Object.entries(prev).filter(([, b]) => now - b.ts < 6500)))
    }, 1000)
    return () => window.clearTimeout(t)
  }, [bubbles])
  const latestBubble = Object.values(bubbles).sort((a, b) => b.sent - a.sent)[0]

  // Bong bóng của chính mình trên đầu người ngồi ở quầy. Đang mở chat thì bảng chat
  // che mất nhân vật → để dành, hiện lúc đóng chat (nếu tin vừa gửi trong 30 giây)
  const [myBubble, setMyBubble] = useState<{text: string; sentAt: number; shownAt: number | null} | null>(null)
  const onSentText = useCallback((text: string) => setMyBubble({text, sentAt: Date.now(), shownAt: null}), [])
  useEffect(() => {
    if (!myBubble) return
    if (myBubble.shownAt === null) {
      if (chatOpen) {
        const t = window.setTimeout(() => setMyBubble(null), Math.max(0, 30_000 - (Date.now() - myBubble.sentAt)))
        return () => window.clearTimeout(t)
      }
      // eslint-disable-next-line react-hooks/set-state-in-effect -- chat vừa đóng → hiện bong bóng
      setMyBubble({...myBubble, shownAt: Date.now()})
      return
    }
    const t = window.setTimeout(() => setMyBubble(null), 6000)
    return () => window.clearTimeout(t)
  }, [myBubble, chatOpen])
  const clip = (text: string, n = 60) => (text.length > n ? `${text.slice(0, n - 1)}…` : text)

  // Bàn nhóm chỉ có ở quán cà phê
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (theme !== 'cafe') setGroupView(false)
  }, [theme])

  useEffect(() => {
    const scene = sceneRef.current
    if (!scene) return
    scene.setGroupView(groupView)
    scene.frame(performance.now())
  }, [groupView])

  useEffect(() => {
    const scene = sceneRef.current
    if (!scene) return
    scene.setGroupWall(groupWall)
    scene.frame(performance.now())
  }, [groupWall])

  // Chưa qua màn chào thì chưa báo "Có gì mới" (nút đang ẩn)
  const updatesSeen = useUpdatesSeen(updates, entered ? returning : null)

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

  // Đã chạm vào mèo lần nào (bấm hoặc nhấn giữ) → thôi gợi ý "Pet me"
  const markPetted = useCallback(() => {
    if (catPetted) return
    setCatPetted(true)
    trackEvent({name: 'Chill Pet Cat'})
    try {
      localStorage.setItem(CAT_PETTED_KEY, '1')
    } catch {
      // Chặn storage — lần sau lại hiện gợi ý, không sao
    }
  }, [catPetted])

  const petCat = useCallback(() => {
    const kind = sceneRef.current?.petCat()
    if (!kind) return
    audioRef.current?.catSound(kind)
    // Cảnh đang pause vẫn vẽ lại 1 frame cho thấy mèo ngẩng lên
    sceneRef.current?.frame(performance.now())
    markPetted()
  }, [markPetted])

  // Nhấn giữ vào mèo → gừ gừ tới khi thả tay (tiếng gừ dài ~2,3 giây nên phát nối nhau).
  // Cú "click" trình duyệt bắn ra lúc thả tay không được tính thêm 1 lần vuốt
  const purrTimers = useRef<{wait?: number; loop?: number}>({})
  const purrHeld = useRef(false)
  const startPurrHold = (e: React.PointerEvent) => {
    if (e.button > 0) return
    purrHeld.current = false
    window.clearTimeout(purrTimers.current.wait)
    purrTimers.current.wait = window.setTimeout(() => {
      purrHeld.current = true
      sceneRef.current?.purrCat(true)
      audioRef.current?.catSound('purr')
      purrTimers.current.loop = window.setInterval(() => audioRef.current?.catSound('purr'), 2100)
      markPetted()
    }, CAT_HOLD_MS)
  }
  const stopPurrHold = useCallback(() => {
    window.clearTimeout(purrTimers.current.wait)
    window.clearInterval(purrTimers.current.loop)
    if (!purrHeld.current) return
    sceneRef.current?.purrCat(false)
    window.setTimeout(() => (purrHeld.current = false), 0)
  }, [])
  useEffect(() => stopPurrHold, [stopPurrHold])
  const onCatClick = () => {
    if (purrHeld.current) return
    petCat()
  }

  // ---------- Cần câu lông vũ (wand.ts) ----------

  // Bày cần câu khi đang ở quầy, cảnh không tạm dừng — kể cả lúc chạy phin (khách vào quán
  // chủ yếu để làm việc, ẩn lúc Focus thì gần như không ai thấy)
  const toyAvailable = catToyOn && !groupView && !scenePaused
  const toyOut = toyAvailable && toyIn === theme
  useEffect(() => {
    sceneRef.current?.setToyProp(toyAvailable)
  }, [toyAvailable])

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setToySeen(localStorage.getItem(TOY_SEEN_KEY) === '1')
    } catch {
      // Chặn storage → coi như đã thấy, khỏi nhắc mãi
    }
  }, [])

  // Chưa cầm lần nào: nhãn tự hiện (cả điện thoại, nơi không rê chuột được), mèo liếc sang.
  // Đang chạy phin thì chỉ còn sao lấp lánh, khỏi làm khách xao nhãng
  const toyHintOn = entered && !toySeen && toyAvailable && !toyOut && !toyRest && !focusLabel
  useEffect(() => {
    if (!toyHintOn) return
    const show = window.setTimeout(() => {
      setToyHint(true)
      sceneRef.current?.noticeCat()
    }, TOY_HINT_DELAY_MS)
    const hide = window.setTimeout(() => setToyHint(false), TOY_HINT_DELAY_MS + TOY_HINT_MS)
    return () => {
      window.clearTimeout(show)
      window.clearTimeout(hide)
      setToyHint(false)
    }
  }, [toyHintOn])

  const toyRestTimer = useRef(0)
  const toyTipTimer = useRef(0)
  useEffect(() => () => window.clearTimeout(toyTipTimer.current), [])
  useEffect(() => {
    const scene = sceneRef.current
    if (!scene) return
    scene.onCatToy = (e) => {
      if (e === 'catch') audioRef.current?.catSound('meow')
      if (e !== 'tired') return
      // Mèo hết sức nhả cần câu: cần câu về chỗ dựng, mèo ngủ bù 20 giây mới chơi tiếp
      setToyIn(null)
      setToyRest(true)
      window.clearTimeout(toyRestTimer.current)
      toyRestTimer.current = window.setTimeout(() => setToyRest(false), TOY_REST_MS)
    }
    return () => {
      scene.onCatToy = undefined
      window.clearTimeout(toyRestTimer.current)
    }
  }, [])

  // Cầm cần câu: tay người xem (chuột / ngón tay) là đầu dây câu, Esc để cất
  useEffect(() => {
    toyOutRef.current = toyOut
    const scene = sceneRef.current
    if (!scene) return
    if (!toyOut) {
      scene.stopToy()
      return
    }
    scene.startToy()
    const move = (e: PointerEvent) => {
      const p = toSceneRef.current(e.clientX, e.clientY)
      scene.moveToy(p.x, p.y)
    }
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setToyIn(null)
    }
    window.addEventListener('pointermove', move, {passive: true})
    window.addEventListener('pointerdown', move, {passive: true})
    window.addEventListener('keydown', key)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerdown', move)
      window.removeEventListener('keydown', key)
    }
  }, [toyOut])

  const toggleToy = () => {
    if (toyRest) return
    if (!toyOut) {
      trackEvent({name: 'Chill Cat Toy'})
      setToySeen(true)
      try {
        localStorage.setItem(TOY_SEEN_KEY, '1')
      } catch {
        // Chặn storage — lần sau lại nhắc, không sao
      }
      setToyTip(true)
      window.clearTimeout(toyTipTimer.current)
      toyTipTimer.current = window.setTimeout(() => setToyTip(false), TOY_TIP_MS)
      // Màn dọc: mèo hay nằm ngoài khung → lia cảnh tới chỗ mèo
      const hit = sceneRef.current?.catHitBox
      if (hit) panTo(hit)
    }
    setToyIn(toyOut ? null : theme)
  }

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
    if (window.matchMedia('(min-width: 1024px)').matches) sayCat(t.room.catThanks)
    else catSayQueued.current = t.room.catThanks
  }, [petCat, sayCat, t])

  useEffect(() => {
    if (wishOpen || !catSayQueued.current) return
    const text = catSayQueued.current
    catSayQueued.current = null
    // Chờ khung trượt xuống xong
    const id = window.setTimeout(() => sayCat(text), 350)
    return () => clearTimeout(id)
  }, [wishOpen, sayCat])

  // ---------- Khách quen + đồng hồ phin ----------

  // Vào quán (qua màn chào) = 1 dấu cho hôm nay. Khách cũ ghé lần đầu trong ngày thì mèo
  // ngẩng lên chào (lần ghé đầu tiên trong đời thì chưa quen, không chào)
  useEffect(() => {
    if (!entered || !loaded || stamped.current) return
    stamped.current = true
    const before = loadRegular()
    const {regular: next, fresh} = stampToday(before)
    setRegular(next)
    if (!fresh || before.total === 0) return
    const id = window.setTimeout(() => {
      sceneRef.current?.noticeCat()
      sayCat(t.room.catBack(streakOf(next)))
    }, CAT_GREET_DELAY_MS)
    return () => window.clearTimeout(id)
  }, [entered, loaded, sayCat, t])

  // ---------- Kệ sưu tầm ----------

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (shelfOn) setShelf(loadShelf())
  }, [shelfOn])

  // Món đang bày → vẽ lên kệ của phòng, tính lại vùng bấm
  useEffect(() => {
    const scene = sceneRef.current
    if (!scene) return
    scene.setShelf(shelfOn ? shelf.shown : [])
    fitRef.current()
    scene.frame(performance.now())
  }, [shelf, shelfOn, theme])

  // Lời mời làm quen (guide.ts): những món khách đã thử — khai báo sớm vì mở kệ cũng tính
  const [guideTried, setGuideTried] = useState<GuideStep[]>([])
  const markTried = useCallback((step: GuideStep) => {
    setGuideTried((tried) => {
      if (tried.includes(step)) return tried
      const next = [...tried, step]
      saveTried(next)
      return next
    })
  }, [])

  const openShelf = useCallback(
    (id?: string) => {
      setShelfPick(id ?? null)
      setShelfOpen(true)
      markTried('shelf')
      trackEvent({name: 'Chill Shelf', props: {action: 'open'}})
    },
    [markTried],
  )

  // ---------- Thử thách chung "Cả quán cùng pha phin" (/api/chill-quest) ----------
  // Mã máy riêng cho thử thách, phin đã góp và phiếu đã bỏ của mùa hiện tại — chỉ lưu trên máy
  const [quest, setQuest] = useState<QuestState | null>(null)
  const [questMine, setQuestMine] = useState(0)
  const [questVote, setQuestVote] = useState<string | null>(null)
  const [questJust, setQuestJust] = useState(false)
  const [questVoteErr, setQuestVoteErr] = useState<'voted' | 'retry' | null>(null)
  const questUid = useCallback(() => {
    try {
      let uid = localStorage.getItem(QUEST_UID_KEY)
      if (!uid || !/^[a-z0-9]{12,32}$/i.test(uid)) {
        uid = crypto.randomUUID().replace(/-/g, '').slice(0, 20)
        localStorage.setItem(QUEST_UID_KEY, uid)
      }
      return uid
    } catch {
      return null
    }
  }, [])
  const questPost = useCallback(
    async (payload: Record<string, string>) => {
      const uid = questUid()
      if (!uid) return null
      try {
        const res = await fetch('/api/chill-quest', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({...payload, uid}), keepalive: true})
        return res.ok ? ((await res.json()) as {ok?: boolean; counted?: boolean; mine?: number; state?: QuestState; voted?: string; code?: string}) : null
      } catch {
        return null
      }
    },
    [questUid],
  )
  useEffect(() => {
    if (!questOn) return
    fetch('/api/chill-quest')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: QuestState | {open: false} | null) => {
        if (!data || !data.open) return
        setQuest(data)
        const mine = readJson<{season?: string; n?: number}>(QUEST_MINE_KEY)
        setQuestMine(mine?.season === data.season ? Number(mine.n) || 0 : 0)
        const vote = readJson<{season?: string; option?: string}>(QUEST_VOTE_KEY)
        setQuestVote(vote?.season === data.season && vote.option ? vote.option : null)
      })
      .catch(() => {})
  }, [questOn])
  const onQuestStart = useCallback(() => {
    setQuestJust(false)
    if (quest) void questPost({action: 'start'})
  }, [quest, questPost])
  const onQuestDone = useCallback(async () => {
    if (!quest) return
    const res = await questPost({action: 'done', name: loadMe().name})
    if (!res?.counted || !res.state) return
    setQuest(res.state)
    setQuestJust(true)
    setQuestMine((n) => {
      const mine = res.mine ?? n + 1
      writeJson(QUEST_MINE_KEY, {season: res.state!.season, n: mine})
      return mine
    })
  }, [quest, questPost])
  // Đổi tên ở đâu trong quán thì bảng góp phin cũng đổi (chỉ khi máy này đã góp phin)
  useEffect(() => {
    if (!quest || questMine <= 0) return
    return onMeChange((me) => void questPost({action: 'name', name: me.name}))
  }, [quest, questMine, questPost])
  const onQuestVote = useCallback(
    async (option: string) => {
      if (!quest) return
      setQuestVoteErr(null)
      const res = await questPost({action: 'vote', option})
      if (res?.ok && res.voted) {
        setQuestVote(res.voted)
        writeJson(QUEST_VOTE_KEY, {season: quest.season, option: res.voted})
        trackEvent({name: 'Chill Quest', props: {action: 'vote', option}})
      } else setQuestVoteErr(res?.code === 'voted' || res?.code === 'ip' ? 'voted' : 'retry')
    },
    [quest, questPost],
  )

  const primeAudio = useCallback(() => audioRef.current?.prime(), [])
  const destId = dest?.id
  const onFocusDone = useCallback((minutes: number) => {
    audioRef.current?.chime()
    sceneRef.current?.noticeCat()
    sayCat(t.room.catPhin)
    setRegular((r) => addPhin(r, minutes))
    setBookNudge(true)
    void onQuestDone()
    if (!shelfOn) return
    // Mèo mang ra 1 món cho kệ (nếu tới lượt) — hiện trong bảng tổng kết phin
    const item = pickGift(shelf, {phins: regular.phins + 1, place: destId, weather, time})
    if (!item) return
    if (!shelf.owned.length) sayCat(t.shelf.firstGift)
    setShelf(addItem(shelf, item.id, new Date(), {place: destId, weather, time, phin: regular.phins + 1}))
    setGift(item.id)
    trackEvent({name: 'Chill Shelf', props: {action: 'gift'}})
  }, [sayCat, t, shelfOn, shelf, regular.phins, destId, weather, time, onQuestDone])

  // Hết giờ nghỉ giữa 2 phin: chuông khác + mèo gọi pha tiếp (không tính gì thêm)
  const onBreakDone = useCallback(() => {
    audioRef.current?.breakChime()
    sceneRef.current?.noticeCat()
    sayCat(t.room.catBreak)
  }, [sayCat, t])

  // ---------- Cuốn sổ "Việc hôm nay" ----------
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBookSeen(localStorage.getItem(BOOK_SEEN_KEY) === '1')
    } catch {
      // Chặn storage → coi như đã thấy, không lấp lánh mãi
    }
  }, [])

  useEffect(() => {
    if (!entered || bookSeen) return
    const show = window.setTimeout(() => setBookTip(true), BOOK_TIP_DELAY_MS)
    const hide = window.setTimeout(() => setBookTip(false), BOOK_TIP_DELAY_MS + BOOK_TIP_MS)
    return () => {
      window.clearTimeout(show)
      window.clearTimeout(hide)
    }
  }, [entered, bookSeen])

  const openTodayBook = useCallback(() => {
    setTodayOpen(true)
    setBookTip(false)
    setBookNudge(false)
    setBookSeen(true)
    try {
      localStorage.setItem(BOOK_SEEN_KEY, '1')
    } catch {
      // Chặn storage — lần sau lấp lánh lại, không sao
    }
    trackEvent({name: 'Chill Todo', props: {action: 'book'}})
  }, [])
  const closeTodayBook = useCallback(() => setTodayOpen(false), [])

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

  // Mốc thời gian ngồi ở từng cảnh (event Chill Stay), cộng dồn theo cảnh trong 1 lần mở
  // trang. Chỉ tính khi khách tự ở lại: chuyển ga tắt, tab đang hiện, nhìn thấy phố
  // (bàn nhóm tường gạch che phố). Đồng hồ thật như Chill Listen, máy ngủ tối đa ~1 phút
  const stayMs = useRef(new Map<string, number>())
  const stayMark = useRef(new Map<string, number>())
  const staying = entered && !travel && (!groupView || groupWall === 'glass')
  useEffect(() => {
    if (!staying) return
    const place = dest.id
    let last = Date.now()
    const tick = () => {
      const now = Date.now()
      if (document.visibilityState === 'visible') {
        stayMs.current.set(place, (stayMs.current.get(place) ?? 0) + Math.min(now - last, 65_000))
      }
      last = now
      const mark = stayMark.current.get(place) ?? 0
      const minutes = STAY_MINUTES[mark]
      if (minutes && (stayMs.current.get(place) ?? 0) >= minutes * 60_000) {
        stayMark.current.set(place, mark + 1)
        trackEvent({name: 'Chill Stay', props: {place, minutes}})
      }
    }
    const id = setInterval(tick, 5000)
    return () => {
      clearInterval(id)
      tick()
    }
  }, [staying, dest.id])

  useEffect(() => {
    sceneRef.current?.setMusic(playing)
  }, [playing])

  useEffect(() => {
    const audio = new ChillAudio()
    audioRef.current = audio
    return () => audio.destroy()
  }, [])

  // Phố đường tàu: tải sẵn file còi + tiếng tàu để chuyến đầu đã có tiếng thật
  useEffect(() => {
    if (dest.scenery === 'railway') audioRef.current?.preloadTrain()
  }, [dest.scenery])

  useEffect(() => {
    audioRef.current?.setVolume(volume)
  }, [volume])

  useEffect(() => {
    audioRef.current?.setAmbience(ambience, AMBIENCE_FOR[weather].kind)
  }, [ambience, weather])

  useEffect(() => {
    audioRef.current?.setMix(mix)
  }, [mix])

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
    if (!startTracked.current) {
      startTracked.current = true
      trackEvent({name: 'Chill Start', props: {from: startFrom.current}})
    }
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

  // Đổi tab trạm chỉ đổi danh sách đang xem; bài đang phát / tạm dừng vẫn giữ nguyên. Chưa
  // phát bài nào thì bài đầu của trạm thành bài chờ, bấm Play là nghe trạm đó
  const changeStation = (id: StationId) => {
    if (id === station) return
    setStation(id)
    if (started) return
    const first = tracks.findIndex((t) => stationOf(t) === id)
    if (first < 0) return
    setIndex(first)
    setPosition(0)
    setDuration(tracks[first].duration)
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
    else if (kind === 'zen' && !zen) toggleZen()
    else if (kind === 'mini' && canMini && !miniWin) openMini('update')
    else if (kind === 'phin') {
      // Ngắm cảnh giấu cả thanh trên → tắt trước rồi mới mở bảng phin
      if (zen) toggleZen()
      setChatOpen(false)
      setFocusSignal((n) => n + 1)
    }
    else if (kind === 'table') {
      // Bàn nhóm chỉ có ở quán cà phê
      setTheme('cafe')
      setTableSignal((n) => n + 1)
    } else if (kind === 'glass') {
      // Đang ngồi bàn → sang bàn nhóm, bật vách kính; chưa có bàn → mở màn tạo bàn
      setTheme('cafe')
      if (tableMembers) {
        chooseWall('glass')
        setGroupView(true)
      } else setTableSignal((n) => n + 1)
    }
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

  // Lượt nghe từng bài (/api/chill-plays): số chung của cả quán, CDN giữ 5 phút
  const [playCounts, setPlayCounts] = useState<Record<string, number>>({})
  useEffect(() => {
    if (!playCountsOn) return
    fetch('/api/chill-plays')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: {counts?: Record<string, number>} | null) => data?.counts && setPlayCounts(data.counts))
      .catch(() => {})
  }, [playCountsOn])

  // Bài đang phát đủ PLAY_COUNT_MS (đồng hồ thật, như Chill Listen) → báo +1 lượt. Mỗi lần
  // chuyển sang bài khác thì đếm lại; máy chủ bỏ qua nếu máy này đã nghe bài đó trong 24h
  const playCount = useRef({id: '', ms: 0, sent: false})
  const currentId = tracks[index]?.id
  useEffect(() => {
    if (!playing || !playCountsOn || !currentId) return
    if (playCount.current.id !== currentId) playCount.current = {id: currentId, ms: 0, sent: false}
    let last = Date.now()
    const tick = () => {
      const now = Date.now()
      const c = playCount.current
      c.ms += Math.min(now - last, 65_000)
      last = now
      if (c.sent || c.ms < PLAY_COUNT_MS) return
      c.sent = true
      fetch('/api/chill-plays', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({id: c.id}),
        keepalive: true,
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data: {counted?: boolean} | null) => {
          if (data?.counted) setPlayCounts((prev) => ({...prev, [c.id]: (prev[c.id] ?? 0) + 1}))
        })
        .catch(() => {})
    }
    const id = setInterval(tick, 2000)
    return () => {
      clearInterval(id)
      tick()
    }
  }, [playing, playCountsOn, currentId])

  // Mốc thời gian nghe (cộng dồn lúc đang phát, tính theo đồng hồ thật vì timer bị
  // bóp khi tab chạy nền; máy ngủ thì mỗi nhịp tính tối đa ~1 phút)
  const listenedMs = useRef(0)
  const listenMark = useRef(0)
  useEffect(() => {
    if (!playing) return
    let last = Date.now()
    const tick = () => {
      const now = Date.now()
      listenedMs.current += Math.min(now - last, 65_000)
      last = now
      const minutes = LISTEN_MINUTES[listenMark.current]
      if (minutes && listenedMs.current >= minutes * 60_000) {
        listenMark.current += 1
        trackEvent({name: 'Chill Listen', props: {minutes}})
      }
    }
    const id = setInterval(tick, 5000)
    return () => {
      clearInterval(id)
      tick()
    }
  }, [playing])

  // ---------- Cửa sổ nổi (MiniPlayer.tsx) ----------

  // Công tắc Studio (?mini=1 / ?mini=0 ghi đè) · trình duyệt có Document PiP không
  const [miniFlag, setMiniFlag] = useState(false)
  const [canMini, setCanMini] = useState(false)
  const [miniWin, setMiniWin] = useState<Window | null>(null)
  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get('mini')
    const on = param ? param === '1' : miniPlayerOn
    /* eslint-disable react-hooks/set-state-in-effect -- đọc URL + khả năng trình duyệt sau khi hydrate */
    setMiniFlag(on)
    // Nút Thu nhỏ chỉ có trên màn rộng (thanh trên điện thoại đã chật)
    setCanMini(on && canMiniPlayer() && window.matchMedia('(min-width: 640px)').matches)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [miniPlayerOn])

  // Phím media trên bàn phím / màn hình khoá điều khiển được nhạc
  useEffect(() => {
    if (!('mediaSession' in navigator) || !started) return
    // Công tắc cửa sổ nổi bật: thêm trạm, điểm đến và ảnh quán
    const stationName = STATIONS.find((st) => st.id === stationOf(track))?.label ?? ''
    navigator.mediaSession.metadata = new MediaMetadata(
      miniFlag
        ? {
            title: track.title,
            artist: `${stationName} · Lofi Pixel Cafe`,
            album: destinations[destIndex]?.name,
            artwork: [
              {src: '/chill/app/icon-192.png', sizes: '192x192', type: 'image/png'},
              {src: '/chill/app/icon-512.png', sizes: '512x512', type: 'image/png'},
            ],
          }
        : {title: track.title, artist: 'Chill for work', album: track.mood}
    )
    navigator.mediaSession.playbackState = playing ? 'playing' : 'paused'
    navigator.mediaSession.setActionHandler('play', togglePlay)
    navigator.mediaSession.setActionHandler('pause', togglePlay)
    navigator.mediaSession.setActionHandler('nexttrack', next)
    navigator.mediaSession.setActionHandler('previoustrack', prev)
  }, [started, playing, track, togglePlay, next, prev, miniFlag, destinations, destIndex])

  const openMini = useCallback(
    (from: 'button' | 'auto' | 'guide' | 'update') => {
      openMiniWindow()
        .then((win) => {
          if (!win) return
          miniRef.current = true
          setMiniWin(win)
          markTried('mini')
          trackEvent({name: 'Chill Mini', props: {from}})
        })
        .catch(() => {})
    },
    [markTried]
  )
  const closeMini = useCallback(() => {
    miniRef.current = false
    setMiniWin(null)
  }, [])
  // Bấm 1 bài trong danh sách của cửa sổ nổi: bài đang phát thì phát/dừng
  const pickMini = useCallback((i: number) => (i === index && started ? togglePlay() : playAt(i)), [index, started, togglePlay, playAt])
  // Rời trang khi cửa sổ nổi còn mở → đóng luôn
  useEffect(() => () => miniWin?.close(), [miniWin])

  // Màn hình khoá / thông báo / Control Center: thanh tua. Chrome còn tự mở cửa sổ nổi khi
  // khách chuyển tab lúc nhạc đang phát (nếu khách cho phép)
  useEffect(() => {
    if (!miniFlag || !('mediaSession' in navigator) || !started) return
    const ms = navigator.mediaSession
    const set = (action: string, handler: MediaSessionActionHandler | null) => {
      try {
        ms.setActionHandler(action as MediaSessionAction, handler)
      } catch {
        // Trình duyệt chưa biết hành động này
      }
    }
    set('seekto', (d) => {
      const audio = audioRef.current
      if (!audio || d.seekTime === undefined) return
      audio.seek(d.seekTime)
      setPosition(d.seekTime)
    })
    if (canMini) set('enterpictureinpicture', () => openMini('auto'))
    return () => {
      set('seekto', null)
      set('enterpictureinpicture', null)
    }
  }, [miniFlag, canMini, started, openMini])

  // Vị trí bài cho thanh tua — trình duyệt tự chạy tiếp, chỉ cần báo lại khi đổi bài / dừng / tua
  useEffect(() => {
    if (!miniFlag || !('mediaSession' in navigator) || !started) return
    const audio = audioRef.current
    const d = audio?.duration() ?? duration
    if (!audio || !Number.isFinite(d) || d <= 0) return
    try {
      navigator.mediaSession.setPositionState({duration: d, position: Math.min(d, audio.position()), playbackRate: 1})
    } catch {
      // position > duration lúc vừa đổi bài
    }
  }, [miniFlag, started, playing, index, duration])

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current
    if (!audio || !started) return
    const rect = e.currentTarget.getBoundingClientRect()
    const sec = ((e.clientX - rect.left) / rect.width) * duration
    audio.seek(sec)
    setPosition(sec)
  }

  // Kéo 1 thanh trong bộ trộn: bắt đầu từ mức đang nghe (theo cảnh hoặc bản trộn cũ), từ
  // đó là bản trộn riêng. Kéo thanh / bấm nút là thao tác người dùng → được phép bật âm thanh
  const changeChannel = (channel: MixChannel, value: number) => {
    const next = {...(mix ?? sceneMix(ambience, AMBIENCE_FOR[weather].kind)), [channel]: value}
    if (!mix) trackEvent({name: 'Chill Mix', props: {preset: 'custom'}})
    setMix(next)
    audioRef.current?.setMix(next, true)
  }
  const choosePreset = (id: MixPreset | 'scene' | 'mute') => {
    const next = id === 'scene' ? null : id === 'mute' ? SILENT : MIX_PRESETS[id]
    trackEvent({name: 'Chill Mix', props: {preset: id}})
    setMix(next)
    audioRef.current?.setMix(next, true)
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
    try {
      localStorage.setItem(SETTINGS_SEEN_KEY, '1')
    } catch {
      // bỏ qua
    }
  }, [panelOpen, settingsSeen])
  // Hiện sau khi bấm Play một lúc, nhường thông báo "Có gì mới" hiện trước
  const otherOverlay = wishOpen || todayOpen || chatOpen || boardOpen || updatesOpen || updatesSeen.toast || diaryOpen || shelfOpen

  // Bảng nhật ký phủ gần hết màn hình → mở bảng / khung khác thì nhật ký tự đóng
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (panelOpen || wishOpen || chatOpen || boardOpen || updatesOpen) setDiaryOpen(false)
  }, [panelOpen, wishOpen, chatOpen, boardOpen, updatesOpen])
  // Bấm phát (kể cả phím Space) hoặc mở bảng nào đó bằng phím tắt → coi như đã vào quán
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (started || panelOpen || wishOpen || chatOpen || boardOpen || updatesOpen) setEntered(true)
  }, [started, panelOpen, wishOpen, chatOpen, boardOpen, updatesOpen])
  const enter = (music: boolean) => {
    if (entered) return
    setEntered(true)
    if (!music) return trackEvent({name: 'Chill Look Around'})
    startFrom.current = 'welcome'
    if (!started) playAt(index)
  }
  // Lời mời làm quen với quán (xem guide.ts): mỗi lúc 1 món, làm rồi thì thôi mời
  const [guide, setGuide] = useState<{step: GuideStep; forced: boolean} | null>(null)
  const [guideShown, setGuideShown] = useState<GuideStep[]>([])
  const guideLeft = useRef(0)
  // Lời mời vừa hiện thì giữ giao diện lại 1 lúc (khách ngồi yên thì giao diện tự ẩn sau 3,5s,
  // lời mời sẽ không ai thấy)
  const [guideHold, setGuideHold] = useState(false)
  const [diaryAvailable, setDiaryAvailable] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- đọc localStorage sau khi hydrate
    setGuideTried(loadTried())
  }, [])
  const onFocusOpen = useCallback(
    (open: boolean) => {
      setFocusOpen(open)
      if (open) markTried('phin')
      else setGift(null)
    },
    [markTried],
  )
  const guideDone: Record<GuideStep, boolean> = {
    phin: regular.phins > 0 || guideTried.includes('phin'),
    drink: drink !== null,
    cat: catPetted,
    diary: guideTried.includes('diary'),
    settings: settingsSeen,
    shelf: shelf.owned.length > 0 || guideTried.includes('shelf'),
    mini: guideTried.includes('mini'),
  }
  // Phòng không có ly, đang xem bàn nhóm, Studio tắt nhật ký → bỏ qua món đó
  const guideCan: Record<GuideStep, boolean> = {
    phin: true,
    drink: hasGlass && !groupView,
    cat: !groupView,
    diary: diaryAvailable,
    settings: true,
    shelf: shelfOn && !groupView,
    mini: canMini,
  }
  const guideNext = guideShown.length < GUIDE_PER_VISIT ? (GUIDE_ORDER.find((s) => guideCan[s] && !guideDone[s] && !guideShown.includes(s)) ?? null) : null
  const activeGuide = guide && guideCan[guide.step] && (guide.forced || !guideDone[guide.step]) ? guide.step : null
  // Cửa sổ nổi đang mở → khách không nhìn tab quán, gợi ý chờ tới khi đưa quán về
  const guideBusy = panelOpen || volumeOpen || otherOverlay || focusOpen || drinkOpen || menuOpen || miniWin !== null
  useEffect(() => {
    // Đang chạy 1 phin → khách đang tập trung, không mời thêm gì
    if (!entered || zen || activeGuide || !guideNext || focusLabel || miniWin) return
    const id = window.setTimeout(
      () => {
        guideLeft.current = GUIDE_SHOW_MS
        setGuideShown((shown) => [...shown, guideNext])
        setGuide({step: guideNext, forced: false})
        setGuideHold(true)
        trackEvent({name: 'Chill Guide', props: {action: 'hint', step: guideNext}})
      },
      guideShown.length ? GUIDE_GAP_MS : GUIDE_FIRST_MS,
    )
    return () => window.clearTimeout(id)
  }, [entered, zen, activeGuide, guideNext, guideShown.length, focusLabel, miniWin])
  useEffect(() => {
    if (!guideHold) return
    const id = window.setTimeout(() => setGuideHold(false), GUIDE_HOLD_MS)
    return () => window.clearTimeout(id)
  }, [guideHold, guide])
  // Chỉ chỗ từ thực đơn: khách mở bảng nào đó là coi như đã thấy
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (guide?.forced && guideBusy) setGuide(null)
  }, [guide, guideBusy])
  // Màn dọc mặc định đứng ở phía người ngồi; mèo + phin thường nằm ngoài khung → lia cảnh tới
  useEffect(() => {
    const scene = sceneRef.current
    if (!scene) return
    const hit = activeGuide === 'drink' ? scene.drinkHitBox : activeGuide === 'cat' ? scene.catHitBox : activeGuide === 'shelf' ? scene.shelfFirstSlotBox : null
    if (hit) panTo(hit)
  }, [activeGuide, panTo])
  const pointAt = (step: GuideStep) => {
    setMenuOpen(false)
    guideLeft.current = GUIDE_POINT_MS
    setGuide({step, forced: true})
    setGuideHold(true)
    trackEvent({name: 'Chill Guide', props: {action: 'menu', step}})
  }
  useEffect(() => {
    if (!menuOpen) return
    const onDown = (e: PointerEvent) => !(e.target as Element).closest('[data-chill-menu]') && setMenuOpen(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false)
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])
  const [tableAvailable, setTableAvailable] = useState(false)
  const [shareCopied, setShareCopied] = useState(false)
  const hintTip = activeGuide === 'settings'
  const settingsGlow = guideShown.includes('settings') && !settingsSeen

  // Zen là tính năng mới: công tắc có chấm cam + vòng sáng tới khi bật thử lần đầu.
  // Người đã quen quán (đã mở cài đặt) thì thêm 1 bong bóng gợi ý — nhường thông báo
  // "Có gì mới" và gợi ý Settings hiện trước, không chồng lên nhau
  const [zenSeen, setZenSeen] = useState(true)
  const [zenHint, setZenHint] = useState(false)
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- đọc localStorage sau khi hydrate
      setZenSeen(localStorage.getItem(ZEN_SEEN_KEY) === '1')
    } catch {
      // Chặn storage → không làm phiền
    }
  }, [])
  useEffect(() => {
    if (!entered || zenSeen || !settingsSeen || hintTip || panelOpen || otherOverlay) return
    try {
      if (localStorage.getItem(ZEN_HINT_KEY) === '1') return
    } catch {
      return
    }
    const t = window.setTimeout(() => {
      setZenHint(true)
      try {
        localStorage.setItem(ZEN_HINT_KEY, '1')
      } catch {
        // bỏ qua
      }
    }, ZEN_HINT_DELAY_MS)
    return () => window.clearTimeout(t)
  }, [entered, zenSeen, settingsSeen, hintTip, panelOpen, otherOverlay])
  useEffect(() => {
    if (!zenHint) return
    const t = window.setTimeout(() => setZenHint(false), ZEN_HINT_MS)
    return () => window.clearTimeout(t)
  }, [zenHint])
  const showHintTip = hintTip && !panelOpen && !volumeOpen && !otherOverlay

  // Vách kính chỉ thấy ở bàn nhóm → giới thiệu đúng lúc: bong bóng 1 lần khi vừa lia máy
  // vào bàn nhóm ("Thử ngay"), chấm cam ở tab Atmosphere tới lần đổi tường đầu tiên
  const [wallSeen, setWallSeen] = useState(true)
  const [wallHint, setWallHint] = useState(false)
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- đọc localStorage sau khi hydrate
      setWallSeen(localStorage.getItem(WALL_SEEN_KEY) === '1')
    } catch {
      // Chặn storage → không làm phiền
    }
  }, [])
  const chooseWall = useCallback(
    (value: GroupWall) => {
      setWallHint(false)
      if (!wallSeen) {
        setWallSeen(true)
        try {
          localStorage.setItem(WALL_SEEN_KEY, '1')
        } catch {
          // bỏ qua
        }
      }
      if (value === groupWall) return
      setGroupWall(value)
      trackEvent({name: 'Chill Table', props: {action: value === 'glass' ? 'wall-glass' : 'wall-brick'}})
    },
    [wallSeen, groupWall],
  )
  useEffect(() => {
    if (!groupView || wallSeen || groupWall !== 'brick' || panelOpen || otherOverlay || zen) return
    try {
      if (localStorage.getItem(WALL_HINT_KEY) === '1') return
    } catch {
      return
    }
    // Chờ lia máy xong mới hiện
    const t = window.setTimeout(() => {
      setWallHint(true)
      try {
        localStorage.setItem(WALL_HINT_KEY, '1')
      } catch {
        // bỏ qua
      }
    }, WALL_HINT_DELAY_MS)
    return () => window.clearTimeout(t)
  }, [groupView, wallSeen, groupWall, panelOpen, otherOverlay, zen])
  useEffect(() => {
    if (!wallHint) return
    const t = window.setTimeout(() => setWallHint(false), WALL_HINT_MS)
    return () => window.clearTimeout(t)
  }, [wallHint])
  const wallFresh = !wallSeen && tableMembers !== null && theme === 'cafe'
  const [idle, setIdle] = useState(false)
  const [zenTip, setZenTip] = useState(false)
  // Thanh nhạc gọn trong Ngắm cảnh: mở danh sách bài (giữ thanh hiện trong lúc chọn)
  const [zenList, setZenList] = useState(false)
  const zenBarRef = useRef<HTMLDivElement>(null)
  // Danh sách đang mở: chạm / bấm ra ngoài thanh nhạc là đóng (khỏi phải bấm lại nút)
  useEffect(() => {
    if (!zenList) return
    const onDown = (e: PointerEvent) => {
      if (zenBarRef.current && !zenBarRef.current.contains(e.target as Node)) setZenList(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [zenList])
  const toggleZen = useCallback(() => {
    const next = !zen
    setZenHint(false)
    if (!zenSeen) {
      setZenSeen(true)
      try {
        localStorage.setItem(ZEN_SEEN_KEY, '1')
      } catch {
        // bỏ qua
      }
    }
    if (next) {
      // Vào Zen: đóng hết bảng đang mở, nhắc cách hiện lại công tắc
      setPanelOpen(false)
      setVolumeOpen(false)
      setChatOpen(false)
      setWishOpen(false)
      setBoardOpen(false)
      setUpdatesOpen(false)
      setZenTip(true)
    }
    setZen(next)
    setZenList(false)
    trackEvent({name: 'Chill Zen', props: {on: next ? 'on' : 'off'}})
  }, [zen, zenSeen])
  useEffect(() => {
    if (!zenTip) return
    const t = window.setTimeout(() => setZenTip(false), 3500)
    return () => window.clearTimeout(t)
  }, [zenTip])
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
        case 'h':
        case 'H':
          toggleZen()
          break
        case 'Escape':
          // Đang mở danh sách nhạc thì Esc chỉ đóng danh sách, chưa thoát Ngắm cảnh
          if (zenList) {
            setZenList(false)
            break
          }
          setZen(false)
          setGroupView(false)
          setVolumeOpen(false)
          setChatOpen(false)
          setPanelOpen(false)
          setBoardOpen(false)
          setUpdatesOpen(false)
          setShelfOpen(false)
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [togglePlay, next, prev, toggleFullscreen, toggleZen, zenList])

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
    // Đồng hồ phin đang chạy → thời gian còn lại đứng đầu tiêu đề tab
    const music = started ? `${playing ? '▶' : '❚❚'} ${track.title} · Chill` : baseTitle.current
    document.title = focusLabel ? `${focusLabel} · ${music}` : music
  }, [started, playing, track.title, focusLabel])
  useEffect(() => () => void (document.title = baseTitle.current || document.title), [])

  // <html lang> theo ngôn ngữ đang chọn (layout gốc là "en")
  useEffect(() => {
    document.documentElement.lang = lang
    return () => {
      document.documentElement.lang = 'en'
    }
  }, [lang])

  const timeLabel = t.room.times[time]
  const weatherLabel = t.room.weathers[weather]
  const ambienceLabel = t.room.ambience[AMBIENCE_FOR[weather].kind]
  const mixShown = mix ?? sceneMix(ambience, AMBIENCE_FOR[weather].kind)
  const mixPreset = presetOf(mix)
  const progress = duration ? Math.min(1, position / duration) : 0
  const stationLabel = STATIONS.find((st) => st.id === playingStation)?.label ?? ''
  const hideUi = idle && started && !panelOpen && !volumeOpen && !showHintTip && !wishOpen && !todayOpen && !chatOpen && !boardOpen && !updatesOpen && !diaryOpen && !shelfOpen && !updatesSeen.toast && !focusOpen && !drinkOpen && !menuOpen && !(guideHold && activeGuide) && !hovering
  // Lời mời chỉ hiện (và chỉ tính giờ) khi khách thấy được nó: không bảng nào đang mở, giao
  // diện không tự ẩn. Gợi ý Settings tự giữ giao diện lại nên không phụ thuộc hideUi
  const guideVisible = entered && !zen && !guideBusy && (activeGuide === 'settings' || !hideUi)
  const guideOn = (step: GuideStep) => activeGuide === step && guideVisible
  useEffect(() => {
    if (!guide || !guideVisible) return
    const t0 = performance.now()
    const id = window.setTimeout(() => setGuide(null), Math.max(0, guideLeft.current))
    return () => {
      window.clearTimeout(id)
      guideLeft.current -= performance.now() - t0
    }
  }, [guide, guideVisible])
  // Điện thoại: nhóm "Khác" trong thực đơn — thay cho các nút đã rút khỏi màn hình
  const menuMore: {id: string; icon: string; label: string; dot?: boolean; run: () => void}[] = [
    {
      id: 'share',
      icon: '↗',
      label: shareCopied ? t.room.menuCopied : t.share.share,
      run: () =>
        void shareChill(t.share.title).then((copied) => {
          if (!copied) return setMenuOpen(false)
          setShareCopied(true)
          window.setTimeout(() => setShareCopied(false), 1500)
        }),
    },
    ...(updates.length > 0
      ? [
          {
            id: 'updates',
            icon: '✦',
            label: t.updates.button,
            dot: updatesSeen.dot,
            run: () => {
              setMenuOpen(false)
              openUpdates('button')
            },
          },
        ]
      : []),
    {
      id: 'wish',
      icon: '✎',
      label: t.wish.label,
      run: () => {
        setMenuOpen(false)
        setPanelOpen(false)
        setBoardOpen(false)
        setUpdatesOpen(false)
        setChatOpen(false)
        setWishOpen(true)
      },
    },
    ...(tableAvailable && !tableMembers
      ? [
          {
            id: 'table',
            icon: '☷',
            label: t.table.inviteLabel,
            run: () => {
              setMenuOpen(false)
              setTableSignal((n) => n + 1)
            },
          },
        ]
      : []),
    ...(canFullscreen
      ? [
          {
            id: 'fullscreen',
            icon: '⛶',
            // Bỏ phần gợi ý phím tắt "(F)" — điện thoại không có bàn phím
            label: (fullscreen ? t.room.exitFullscreen : t.room.fullscreen).replace(/\s*\(.*\)$/, ''),
            run: () => {
              setMenuOpen(false)
              toggleFullscreen()
            },
          },
        ]
      : []),
  ]
  // Thực đơn của quán: ở đây có gì — bấm 1 dòng thì quán chỉ chỗ (xem guide.ts). Điện thoại: nút
  // nằm cuối hàng trên và mang luôn chấm "có gì mới" (nút Có gì mới đã chui vào thực đơn)
  const menuButton = (
    <button
      data-chill-menu
      type="button"
      onClick={() => {
        if (!menuOpen) {
          setPanelOpen(false)
          setVolumeOpen(false)
          trackEvent({name: 'Chill Guide', props: {action: 'menu', step: 'open'}})
        }
        setMenuOpen((o) => !o)
      }}
      aria-expanded={menuOpen}
      aria-controls="chill-menu"
      className={`relative flex h-9 items-center gap-1.5 whitespace-nowrap rounded-md border px-2.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[#f6dcbd] backdrop-blur transition hover:border-[#e8b27d]/80 hover:text-white focus-visible:outline-2 focus-visible:outline-[#e8b27d] sm:text-[11px] ${
        menuOpen ? 'border-[#e8b27d]/80 bg-[#2a1f18]/90' : 'border-[#e8b27d]/45 bg-[#2a1f18]/75'
      }`}
    >
      <MenuCardIcon />
      {t.room.menu}
      {updatesSeen.dot && <span aria-hidden className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border border-black/40 bg-[#f08a5d] sm:hidden" />}
    </button>
  )
  const fade = `transition-opacity duration-700 ${hideUi || !entered ? 'pointer-events-none opacity-0' : 'opacity-100'}`
  const hoverProps = {onPointerEnter: () => setHovering(true), onPointerLeave: () => setHovering(false)}

  return (
    <div className={`relative h-dvh w-full select-none overflow-clip bg-[#16131a] text-[#ede6dd] ${hideUi || (zen && idle && !zenList) ? 'cursor-none' : ''}`}>
      <h1 className="sr-only">Chill for work — slow morning, strong coffee</h1>

      {/* Ngang: cảnh phủ kín màn hình. Dọc (điện thoại): khung cảnh nằm giữa thanh trên và
          thanh nhạc; màn chào thấy trọn cảnh, vào quán thì cảnh phóng to cao bằng khung
          (mở đầu ở chỗ người ngồi), kéo ngang để nhìn sang mèo / cửa sổ — xem `fit` */}
      <div
        ref={wrapRef}
        onPointerDown={onPanDown}
        onPointerMove={onPanMove}
        onPointerUp={onPanUp}
        onPointerCancel={onPanUp}
        className={`absolute inset-0 overflow-hidden portrait:bottom-[11rem] portrait:top-[6.5rem] max-sm:portrait:top-[5.25rem] portrait:[touch-action:none] ${toyOut ? 'cursor-none' : canPan && entered ? 'portrait:cursor-grab portrait:active:cursor-grabbing' : ''}`}
      >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full object-cover portrait:bottom-auto portrait:top-1/2 portrait:aspect-video portrait:h-auto portrait:-translate-y-1/2 portrait:transition-transform portrait:duration-700 portrait:ease-out"
        role="img"
        aria-label={
          groupView && table
            ? t.room.canvasTable(table.seated.map((f) => `${f.name} ${t.room.status[f.status] ?? ''}`).join(', '), table.rest.length)
            : t.room.canvasCounter(dest.name, timeLabel.toLowerCase(), weatherLabel.toLowerCase(), shownSeat === 'girl' && hasGirl(theme))
        }
      />
      </div>

      {/* Cửa sổ nổi đang mở: tab gốc nhắc chỗ quán đang phát + nút đưa về */}
      {miniWin && (
        <>
          <MiniPlayer
            win={miniWin}
            source={canvasRef}
            draw={drawRef}
            tracks={tracks}
            index={index}
            station={`${stationLabel} · ${dest.name}`}
            playing={playing}
            onTogglePlay={togglePlay}
            onPrev={prev}
            onNext={next}
            onPick={pickMini}
            onClose={closeMini}
          />
          <div role="status" className="absolute left-1/2 top-16 z-40 flex -translate-x-1/2 items-center gap-3 rounded-full bg-black/60 py-1.5 pl-4 pr-1.5 text-sm text-[#f3ece4] backdrop-blur">
            {t.room.miniHere}
            <button type="button" onClick={() => miniWin.close()} className="rounded-full bg-[#e8b27d] px-3 py-1 text-xs font-medium text-[#1a1410] transition hover:bg-[#f0c494]">
              {t.room.miniBack}
            </button>
          </div>
        </>
      )}

      {/* Zen: công tắc nổi một mình ở góc, chỉ hiện khi vừa nhích chuột / chạm */}
      {zen && (
        <div
          className={`absolute right-3 top-3 z-40 flex flex-col items-end gap-2 transition-opacity duration-500 sm:right-5 sm:top-5 ${
            idle && !zenTip && !zenList ? 'pointer-events-none opacity-0' : 'opacity-100'
          }`}
        >
          <ZenToggle on onToggle={toggleZen} floating />
          {zenTip && (
            <p role="status" className="rounded-md bg-black/55 px-2.5 py-1.5 text-[11px] text-[#f6dcbd] backdrop-blur">
              {t.zen.tip}
            </p>
          )}
        </div>
      )}

      {/* Ngắm cảnh: thanh nhạc gọn giữa đáy — lùi / phát / sang bài, tên bài, mở danh sách.
          Luôn hiện để đổi nhạc được ngay; để yên thì mờ còn 65% (vẫn đọc được tên bài),
          rê chuột / chạm là rõ lại. Bấm ra ngoài là đóng danh sách */}
      {zen && (
        <div
          ref={zenBarRef}
          className={`absolute bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-40 w-[min(420px,calc(100vw-24px))] -translate-x-1/2 transition-opacity duration-700 ${
            idle && !zenTip && !zenList ? 'opacity-65 hover:opacity-100 focus-within:opacity-100' : 'opacity-100'
          }`}
        >
          {zenList && (
            <div className="mb-2 max-h-[min(55dvh,420px)] overflow-y-auto rounded-2xl border border-white/10 bg-[#16131a]/95 p-3 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.9)] backdrop-blur-md">
              <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={t.room.stationAria}>
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
                        on ? 'border-[#e8b27d]/60 bg-[#e8b27d]/15 text-[#f3cfa8]' : 'border-white/10 text-[#a79e94] hover:border-white/25 hover:text-[#ede6dd]'
                      }`}
                    >
                      {st.short}
                    </button>
                  )
                })}
              </div>
              <ol className="mt-2 divide-y divide-white/[0.06]">
                {stationList.map(({tr, i}, pos) => {
                  const active = i === index
                  return (
                    <li key={tr.id}>
                      <button
                        type="button"
                        onClick={() => (active && started ? togglePlay() : playAt(i))}
                        aria-current={active ? 'true' : undefined}
                        className={`grid min-h-11 w-full grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-2 py-2 text-left transition ${
                          active ? 'bg-white/[0.06]' : 'hover:bg-white/[0.04]'
                        }`}
                      >
                        <span className="flex justify-center font-mono text-xs tabular-nums text-[#a79e94]">
                          {active && playing ? <EqualizerIcon /> : String(pos + 1).padStart(2, '0')}
                        </span>
                        <span className={`block truncate text-sm ${active ? 'font-medium text-[#f3cfa8]' : 'text-[#ede6dd]'}`}>{tr.title}</span>
                        <span className="flex flex-col items-end">
                          <span className="font-mono text-xs tabular-nums text-[#a79e94]">{tr.duration ? formatTime(tr.duration) : '–:––'}</span>
                          {playCountsOn && (playCounts[tr.id] ?? 0) >= PLAY_COUNT_SHOW && (
                            <span className="whitespace-nowrap text-[11px] tabular-nums text-[#a79e94]/80">
                              {t.room.plays(formatPlays(playCounts[tr.id], lang))}
                            </span>
                          )}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ol>
            </div>
          )}
          <div className="flex h-14 items-center gap-1 rounded-2xl border border-white/10 bg-[#16131a]/80 px-2 shadow-[0_12px_32px_-12px_rgba(0,0,0,0.9)] backdrop-blur-md">
            <button type="button" onClick={prev} aria-label={t.room.prev} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#ede6dd] transition hover:bg-white/10">
              <PrevIcon />
            </button>
            <button
              type="button"
              onClick={togglePlay}
              aria-label={`${playing ? t.room.pause : t.room.play} (Space)`}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#e8b27d] text-[#2a1a10] transition hover:bg-[#f0c08f]"
            >
              {playing ? <PauseIcon small /> : <PlayIcon small />}
            </button>
            <button type="button" onClick={next} aria-label={t.room.next} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#ede6dd] transition hover:bg-white/10">
              <NextIcon />
            </button>
            <span className="min-w-0 flex-1 px-1.5">
              <span className="block truncate font-mono text-[10px] uppercase tracking-[0.16em] text-[#a79e94]">{stationLabel}</span>
              <span className="block truncate text-sm text-[#ede6dd]">{track.title}</span>
            </span>
            <button
              type="button"
              onClick={() => setZenList((o) => !o)}
              aria-label={t.room.trackList}
              aria-expanded={zenList}
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition ${zenList ? 'bg-[#e8b27d]/20 text-[#f3cfa8]' : 'text-[#ede6dd] hover:bg-white/10'}`}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
                <path d="M3 4.5h9M3 9h9M3 13.5h5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                <path d="M14 8.5v6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                <circle cx="12.6" cy="14.6" r="1.6" fill="currentColor" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Mọi nút / bảng nằm trong lớp này — Zen thì giấu cả lớp, cảnh + nhạc vẫn chạy */}
      <div className={zen ? 'hidden' : 'contents'} inert={!entered}>

      {/* Màn dọc: gợi ý kéo ngang cảnh, ngay mép trên khung cảnh */}
      <p
        aria-hidden
        className={`pointer-events-none absolute left-1/2 top-[7.25rem] z-10 hidden -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full border border-[#e8b27d]/40 bg-black/65 px-3 py-1.5 text-xs text-[#f3cfa8] backdrop-blur transition-opacity duration-500 portrait:flex ${
          panHint && !otherOverlay && !panelOpen ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <span aria-hidden>↔</span>
        {t.room.panHint}
      </p>

      {/* Mèo đang nằm ngoài khung (màn dọc đã phóng to / đang xem bàn nhóm) → lời của mèo
          hiện thành 1 dòng phía trên cảnh thay cho bong bóng cạnh mèo */}
      {catSay && (!catBox || groupView) && (
        <p
          role="status"
          className={`pointer-events-none absolute left-1/2 top-[10rem] z-10 w-max max-w-[calc(100vw-24px)] -translate-x-1/2 rounded-2xl border-2 border-[#2a1a10] bg-[#fbf1d2] px-3 py-2 text-center text-sm font-semibold leading-snug text-[#2a1a10] shadow-[0_8px_24px_-8px_rgba(0,0,0,0.7)] transition duration-500 sm:top-24 ${
            catSay.show ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <span className="font-normal text-[#7a5a3a]">{t.room.cat}:</span> {catSay.text} 🐾
        </p>
      )}

      {/* Bàn nhóm: bảng tên trên đầu từng người + nhãn "+n" + nút quay về quầy.
          Hiện sau khi lia máy xong (~1,2 giây) để không trôi theo cảnh. */}
      {groupView && table && (
        <div className="pointer-events-none absolute inset-0 motion-safe:animate-[chill-fade-in_0.4s_ease-out_1.1s_both]">
          {table.seated.map((f) => {
            const box = seatBoxes[f.display]
            if (!box) return null
            const bubble = f.who ? bubbles[f.who] : undefined
            if (bubble) {
              // Bong bóng lời thoại pixel (cùng kiểu icon chat): nền kem, viền nâu, đuôi chỉ
              // xuống đầu; bấm là mở phòng chat đọc đủ
              return (
                <button
                  key={`b-${f.display}-${bubble.ts}`}
                  type="button"
                  onClick={() => {
                    setPanelOpen(false)
                    setWishOpen(false)
                    setChatOpen(true)
                  }}
                  className="pointer-events-auto absolute -translate-x-1/2 -translate-y-full pb-2 text-left motion-safe:animate-[chill-pop_0.25s_ease-out]"
                  style={{left: box.left + box.width / 2, top: box.top}}
                  aria-label={`${f.name}: ${bubble.text}`}
                >
                  <span
                    className="relative block rounded-[4px] border-2 border-[#2a1d15] bg-[#fbf6ec] px-2.5 py-1.5 text-[12px] leading-snug text-[#2a1d15] shadow-[3px_3px_0_rgba(42,29,21,0.35)]"
                    style={{width: 'max-content', maxWidth: Math.max(150, Math.min(240, box.width * 2))}}
                  >
                    <span className="block text-[10px] font-medium text-[#9a6a45]">{f.name}</span>
                    <span className="line-clamp-2">{clip(bubble.text)}</span>
                    <span aria-hidden className="absolute -bottom-[7px] left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b-2 border-r-2 border-[#2a1d15] bg-[#fbf6ec]" />
                  </span>
                </button>
              )
            }
            if (f.who && typingWho.includes(f.who)) {
              // Đang gõ → bong bóng nhỏ "• • •", 3 chấm nhấp nháy lần lượt
              return (
                <span
                  key={`t-${f.display}`}
                  aria-label={t.room.typing(f.name)}
                  className="absolute -translate-x-1/2 -translate-y-full pb-2 motion-safe:animate-[chill-pop_0.25s_ease-out]"
                  style={{left: box.left + box.width / 2, top: box.top}}
                >
                  <span className="relative flex items-center gap-1 rounded-[4px] border-2 border-[#2a1d15] bg-[#fbf6ec] px-2.5 py-1.5 shadow-[3px_3px_0_rgba(42,29,21,0.35)]">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        aria-hidden
                        className="h-1.5 w-1.5 bg-[#9a6a45] motion-safe:animate-pulse"
                        style={{animationDelay: `${i * 200}ms`}}
                      />
                    ))}
                    <span aria-hidden className="absolute -bottom-[7px] left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b-2 border-r-2 border-[#2a1d15] bg-[#fbf6ec]" />
                  </span>
                </span>
              )
            }
            // Ghế hẹp (điện thoại dọc) → chỉ tên, cắt gọn trong bề ngang ghế
            const roomy = box.width >= 120
            return (
              <span
                key={f.display}
                className="absolute flex -translate-x-1/2 -translate-y-full items-center gap-1 whitespace-nowrap rounded-md bg-black/55 px-1.5 py-0.5 text-[11px] text-[#f6dcbd] backdrop-blur"
                style={{left: box.left + box.width / 2, top: box.top, maxWidth: roomy ? undefined : box.width - 4}}
                title={`${f.name} · ${t.room.status[f.status] ?? ''}`}
              >
                <span className="truncate">{f.name}</span>
                {roomy && <span className="text-[#a79e94]">· {t.room.status[f.status] ?? ''}</span>}
              </span>
            )
          })}
          {table.rest.length > 0 && moreBox && (
            <span
              className="pointer-events-auto absolute flex items-center justify-center whitespace-nowrap rounded-full border border-[#f6d58a] bg-[#3a2618]/90 px-2.5 py-0.5 text-xs text-[#f6d58a]"
              style={{left: moreBox.left, top: moreBox.top}}
              title={table.rest.map((f) => f.name).join(', ')}
            >
              +{table.rest.length}
            </span>
          )}
        </div>
      )}
      {/* Ở quầy: bong bóng của chính mình trên đầu người ngồi (tin mình vừa gửi) */}
      {!groupView && headBox && myBubble?.shownAt && (
        <span
          key={myBubble.sentAt}
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full pb-2 motion-safe:animate-[chill-pop_0.25s_ease-out]"
          style={{left: headBox.left + headBox.width / 2, top: headBox.top}}
        >
          <span className="relative block max-w-[min(240px,70vw)] rounded-[4px] border-2 border-[#2a1d15] bg-[#fbf6ec] px-2.5 py-1.5 text-[12px] leading-snug text-[#2a1d15] shadow-[3px_3px_0_rgba(42,29,21,0.35)]" style={{width: 'max-content'}}>
            <span className="block text-[10px] font-medium text-[#9a6a45]">{t.common.you}</span>
            <span className="line-clamp-2">{clip(myBubble.text)}</span>
            <span aria-hidden className="absolute -bottom-[7px] left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b-2 border-r-2 border-[#2a1d15] bg-[#fbf6ec]" />
          </span>
        </span>
      )}

      {/* Ở quầy: bạn cùng bàn vừa nhắn → 1 dòng xem trước dưới dây đèn (bóng của họ đang
          nháy); bấm là mở bàn nhóm để thấy bong bóng trên đầu họ */}
      {!groupView && theme === 'cafe' && latestBubble && (
        <button
          key={latestBubble.sent}
          type="button"
          onClick={() => setGroupView(true)}
          className="absolute left-1/2 top-[64px] z-10 max-w-[min(360px,calc(100vw-24px))] -translate-x-1/2 truncate rounded-[4px] border-2 border-[#2a1d15] bg-[#fbf6ec] px-2.5 py-1 text-[12px] text-[#2a1d15] shadow-[3px_3px_0_rgba(42,29,21,0.35)] motion-safe:animate-[chill-pop_0.25s_ease-out] sm:top-[76px]"
          title={t.room.seeTable}
        >
          <span className="font-medium text-[#9a6a45]">{latestBubble.name}:</span> {clip(latestBubble.text, 48)}
        </button>
      )}

      {groupView && (
        <div className={`absolute left-3 top-28 z-10 sm:left-5 sm:top-20 ${fade}`}>
          <button
            type="button"
            onClick={() => setGroupView(false)}
            className="flex h-9 items-center gap-1.5 rounded-md border border-[#e8b27d]/45 bg-[#2a1f18]/80 px-3 text-xs font-medium text-[#f6dcbd] backdrop-blur transition hover:border-[#e8b27d]/80 hover:text-white"
          >
            <ArrowIcon dir="left" />
            {t.room.backToWindow}
          </button>
          {/* Gợi ý 1 lần: vách kính (cùng kiểu bong bóng "Ngắm cảnh") */}
          <div
            role="status"
            className={`absolute left-0 top-full mt-2 w-[min(290px,calc(100vw-24px))] transition duration-300 ${
              wallHint ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-1 opacity-0'
            }`}
          >
            {wallHint && (
              <div className="flex items-start gap-2 rounded-xl border border-[#e8b27d]/30 bg-[#1b1a21]/95 p-3 text-left shadow-[0_16px_40px_-12px_rgba(0,0,0,0.8)] backdrop-blur-md">
                <span aria-hidden className="mt-0.5 text-sm leading-none">
                  🪟
                </span>
                <div className="min-w-0 flex-1">
                  <span className="block font-mono text-[10px] uppercase tracking-[0.18em] text-[#e8b27d]">{t.room.wallTipTitle}</span>
                  <span className="mt-0.5 block text-sm leading-snug text-[#ede6dd]">{t.room.wallTipBody}</span>
                  <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <button
                      type="button"
                      onClick={() => chooseWall('glass')}
                      className="rounded-md bg-[#e8b27d] px-2.5 py-1 text-xs font-medium text-[#2a1d15] transition hover:bg-[#f0c08f]"
                    >
                      {t.common.tryIt}
                    </button>
                    <span className="text-[11px] text-[#a79e94]">{t.room.wallTipWhere}</span>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setWallHint(false)}
                  aria-label={t.common.hideTip}
                  className="-mr-1 -mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[#a79e94] transition hover:bg-white/10 hover:text-[#ede6dd]"
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
                    <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mèo trên bậu cửa: bấm (hoặc Tab + Enter) để vuốt ve — mèo ngẩng lên, kêu, tim bay lên */}
      {catBox && !groupView && !toyOut && (
        <button
          type="button"
          aria-label={t.room.petCat}
          onClick={onCatClick}
          onPointerEnter={() => sceneRef.current?.noticeCat()}
          onPointerDown={startPurrHold}
          onPointerUp={stopPurrHold}
          onPointerLeave={stopPurrHold}
          onPointerCancel={stopPurrHold}
          // Nhấn giữ trên điện thoại không bật menu ngữ cảnh / khung chọn chữ
          onContextMenu={(e) => e.preventDefault()}
          className="group absolute cursor-pointer touch-none rounded-2xl outline-none [-webkit-touch-callout:none] focus-visible:ring-2 focus-visible:ring-[#e8b27d]/80"
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
          {/* Nhãn mời vuốt chỉ dành cho người chưa chạm vào mèo lần nào — sau đó ẩn hẳn, vì nó
              nằm đúng chỗ tim / nốt nhạc / tia lấp lánh bay lên */}
          <span
            aria-hidden
            className={`pointer-events-none absolute bottom-full left-[68%] mb-1 flex items-center gap-1.5 whitespace-nowrap rounded-md border border-[#e8b27d]/40 bg-black/60 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[#f3cfa8] backdrop-blur transition-opacity duration-500 motion-safe:animate-[chill-bob_2.4s_ease-in-out_infinite] sm:text-[11px] ${
              catSay ? 'opacity-0' : guideOn('cat') ? 'opacity-100' : catPetted ? 'opacity-0' : 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100'
            }`}
            style={{transform: 'translate(-50%, 0)'}}
          >
            <PawIcon />
            {t.room.petMe}
            <span className="absolute left-1/2 top-full -ml-1 border-x-4 border-t-4 border-x-transparent border-t-black/60" />
          </span>
        </button>
      )}

      {/* Cần câu lông vũ dựng cạnh mèo: bấm để cầm lên trêu mèo, bấm lại (hoặc Esc) để cất */}
      {toyBox && toyAvailable && (
        <button
          type="button"
          aria-label={toyOut ? t.room.toyPut : toyRest ? t.room.toyRest : t.room.toyPick}
          aria-pressed={toyOut}
          disabled={toyRest}
          onClick={toggleToy}
          className="group absolute cursor-pointer rounded-xl outline-none disabled:cursor-default focus-visible:ring-2 focus-visible:ring-[#e8b27d]/80"
          style={toyBox}
        >
          {entered && !hideUi && !toySeen && !toyOut && !toyRest && <BookSparkles />}
          <span
            aria-hidden
            className={`pointer-events-none absolute bottom-full left-1/2 mb-1 whitespace-nowrap rounded-md border border-[#e8b27d]/40 bg-black/60 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[#f3cfa8] backdrop-blur transition-opacity duration-500 sm:text-[11px] ${
              toyOut ? (toyTip ? 'opacity-100' : 'opacity-0') : toyHint ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100'
            }`}
            style={{transform: 'translate(-50%, 0)'}}
          >
            {toyOut ? t.room.toyHint : toyRest ? t.room.toyRest : t.room.toyPick}
          </span>
        </button>
      )}

      {/* Phin + ly trên quầy: bấm để chọn món mình thích — nước trong ly đổi theo, ly trong sổ
          nhật ký cũng đổi theo. Người chưa chọn lần nào thấy nhãn mời như nhãn "vuốt mèo" */}
      {drinkBox && !groupView && (
        <div ref={drinkRef} className="absolute" style={drinkBox}>
          <button
            type="button"
            aria-label={drink ? `${t.diary.drinkAria}: ${t.diary.drinks[drink]}` : t.diary.drinkAria}
            aria-expanded={drinkOpen}
            onClick={() => setDrinkOpen((o) => !o)}
            className="group absolute inset-0 cursor-pointer rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-[#e8b27d]/80"
          >
            <span
              aria-hidden
              className={`pointer-events-none absolute bottom-full left-1/2 mb-1 flex items-center gap-1.5 whitespace-nowrap rounded-md border border-[#e8b27d]/40 bg-black/60 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[#f3cfa8] backdrop-blur transition-opacity duration-500 motion-safe:animate-[chill-bob_2.4s_ease-in-out_infinite] ${
                drinkOpen ? 'opacity-0' : guideOn('drink') ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100'
              }`}
              style={{transform: 'translate(-50%, 0)'}}
            >
              <span aria-hidden>☕</span>
              {t.room.drinkHint}
              <span className="absolute left-1/2 top-full -ml-1 border-x-4 border-t-4 border-x-transparent border-t-black/60" />
            </span>
          </button>
          {drinkOpen && (
            <div
              ref={drinkMenuRef}
              role="dialog"
              aria-label={t.diary.drinkTitle}
              style={{marginLeft: drinkShift}}
              className="absolute bottom-full left-1/2 z-20 mb-2 w-max -translate-x-1/2 rounded-2xl border-2 border-[#2a1a10] bg-[#fbf1d2] px-2.5 pb-2 pt-1.5 text-[#2a1a10] shadow-[0_8px_24px_-8px_rgba(0,0,0,0.7)] motion-safe:animate-[chill-pop_0.25s_ease-out]"
            >
              <p className="text-center text-sm font-semibold leading-snug">{t.diary.drinkTitle}</p>
              <div role="radiogroup" aria-label={t.diary.drinkTitle} className="mt-1 flex gap-1">
                {DRINKS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    role="radio"
                    aria-checked={drink === d}
                    onClick={() => pickDrink(d)}
                    className={`flex w-[68px] flex-col items-center rounded-xl border-2 px-1 pb-1 pt-1.5 transition focus-visible:outline-2 focus-visible:outline-[#9a6a45] ${
                      drink === d ? 'border-[#9a6a45] bg-[#e8b27d]/45' : 'border-transparent hover:bg-[#e8b27d]/30'
                    }`}
                  >
                    <PixelGlass drink={d} />
                    <span className="mt-1 text-xs font-semibold leading-tight">{t.diary.drinks[d]}</span>
                  </button>
                ))}
              </div>
              <span
                aria-hidden
                className="absolute left-1/2 top-full border-x-[6px] border-t-[6px] border-x-transparent border-t-[#2a1a10]"
                style={{marginLeft: -6 - drinkShift}}
              />
            </div>
          )}
        </div>
      )}

      {/* Cuốn sổ trên quầy = "Việc hôm nay" (TodayBook). Chưa mở lần nào, hoặc vừa xong 1 phin:
          sao lấp lánh; lần đầu thêm nhãn gợi ý hiện sẵn. Góp ý chỉ còn nút pill góc phải dưới */}
      {bookBox && !groupView && (
        <button
          type="button"
          data-today-book
          aria-label={t.todo.bookOpen}
          onClick={() => {
            setPanelOpen(false)
            setChatOpen(false)
            setWishOpen(false)
            openTodayBook()
          }}
          className="group absolute min-h-11 min-w-11 cursor-pointer rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-[#e8b27d]/80"
          style={bookBox}
        >
          {entered && !hideUi && (!bookSeen || bookNudge) && <BookSparkles />}
          <span
            aria-hidden
            className={`pointer-events-none absolute bottom-full left-1/2 mb-1 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-md border border-[#e8b27d]/40 bg-black/60 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[#f3cfa8] backdrop-blur transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 sm:text-[11px] ${
              bookTip && entered && !hideUi ? 'opacity-100' : 'opacity-0'
            }`}
          >
            📝 {bookTip ? t.todo.bookTip : t.todo.bookLabel}
          </span>
        </button>
      )}
      <TodayBook
        open={todayOpen}
        onClose={closeTodayBook}
        onBrew={() => {
          closeTodayBook()
          setFocusSignal((n) => n + 1)
        }}
      />

      {/* Món trên kệ sưu tầm: mở sổ sưu tầm ngay món đó. Lời mời "kệ" chỉ vào món đầu */}
      {shelfOn &&
        !groupView &&
        shelfBoxes.map(({id, box}, i) => (
          <button
            key={id}
            type="button"
            aria-label={`${t.shelf.title}: ${t.shelf.items[id]?.name ?? ''}`}
            onClick={() => openShelf(id)}
            className="group absolute cursor-pointer rounded-md outline-none focus-visible:ring-2 focus-visible:ring-[#e8b27d]/80"
            style={box}
          >
            <span
              aria-hidden
              className={`absolute bottom-full left-1/2 mb-1 flex items-center gap-1.5 whitespace-nowrap rounded-md border border-[#e8b27d]/40 bg-black/60 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[#f3cfa8] backdrop-blur transition-opacity duration-500 sm:text-[11px] ${
                i === 0 && guideOn('shelf') ? 'opacity-100 motion-safe:animate-[chill-bob_2.4s_ease-in-out_infinite]' : 'pointer-events-none opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100'
              }`}
              style={{transform: 'translate(-50%, 0)'}}
            >
              {i === 0 && guideOn('shelf') ? t.shelf.open : t.shelf.items[id]?.name}
            </span>
          </button>
        ))}
      {/* Kệ chưa bày món nào (khách mới, hoặc đã cất hết): ô đầu của kệ là lối vào kệ. Ô này
          không có hình gì, nên lúc đang mời thì bấm vào nhãn cũng mở kệ */}
      {shelfOn && !groupView && !shelfBoxes.length && shelfStartBox && (
        <button
          type="button"
          aria-label={t.shelf.open}
          onClick={() => openShelf()}
          className="group absolute min-h-11 min-w-11 cursor-pointer rounded-md outline-none focus-visible:ring-2 focus-visible:ring-[#e8b27d]/80"
          style={shelfStartBox}
        >
          <span
            aria-hidden
            className={`absolute bottom-full left-1/2 mb-1 flex w-max max-w-[14rem] items-center gap-1.5 rounded-md border border-[#e8b27d]/40 bg-black/60 px-2 py-1 text-left font-mono text-[10px] uppercase leading-snug tracking-[0.18em] text-[#f3cfa8] backdrop-blur transition-opacity duration-500 sm:max-w-none sm:whitespace-nowrap sm:text-[11px] ${
              guideOn('shelf') ? 'opacity-100 motion-safe:animate-[chill-bob_2.4s_ease-in-out_infinite]' : 'pointer-events-none opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100'
            }`}
            style={{transform: 'translate(-50%, 0)'}}
          >
            <span aria-hidden>✨</span>
            {shelf.owned.length ? t.shelf.open : t.shelf.empty}
            <span className="absolute left-1/2 top-full -ml-1 border-x-4 border-t-4 border-x-transparent border-t-black/60" />
          </span>
        </button>
      )}

      {/* Lọ tip trên bàn: mở bảng cảm ơn (tên người đã mời Bin cà phê) */}
      {jarBox && !groupView && (
        <button
          type="button"
          aria-label={t.room.tipJar(board?.cups ?? 0)}
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
            🫙 {t.room.board}{board?.cups ? ` · ${board.cups}` : ''}
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
            <span className="max-sm:sr-only">Bin Nguyen</span>
          </Link>
          {/* Điện thoại: tên điểm đến nằm hàng riêng dưới hàng nút (chỗ bên trái hẹp); từ sm
              trở lên nằm cùng hàng. Cụm này chỉ là nhãn thông tin, không có nút bấm */}
          {/* Điện thoại: hàng này chỉ là 1 dòng chú thích trơn (điểm đến · giờ · số người), không
              đóng khung — mọi thứ bấm được nằm ở hàng trên */}
          <div className={`absolute left-4 top-[3.4rem] flex items-center gap-2 sm:contents ${INFO_ROW}`}>
            {[dest.name, weatherLabel, timeLabel].map((label, i) => (
              <span
                key={label}
                className={`${i > 0 ? 'hidden sm:flex' : 'flex'} pointer-events-none h-9 items-center whitespace-nowrap rounded-md bg-black/45 px-2.5 font-mono text-[10px] uppercase tracking-[0.18em] text-white/90 backdrop-blur sm:text-[11px]`}
              >
                {label}
              </span>
            ))}
            <span className="pointer-events-none flex font-mono text-[10px] tabular-nums sm:hidden">{clock}</span>
            {/* Có người khác đang ngồi quán → nêu số; chỉ có mình thì thôi (quán vắng nhìn buồn) */}
            {online >= MIN_ONLINE_SHOWN && (
              <span
                className="pointer-events-none flex h-9 items-center gap-1.5 whitespace-nowrap rounded-md bg-black/45 px-2.5 font-mono text-[10px] uppercase tracking-[0.18em] text-white/90 backdrop-blur sm:text-[11px]"
              >
                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span className="sr-only">{t.room.onlineTitle(online - 1)}</span>
                <span aria-hidden className="tabular-nums">{t.room.online(online)}</span>
              </span>
            )}
            <span className="hidden sm:contents">{menuButton}</span>
          </div>
          {menuOpen && (
            <div
              data-chill-menu
              id="chill-menu"
              role="dialog"
              aria-label={t.room.menuTitle}
              className="absolute left-3 top-[5.25rem] z-40 w-[min(21rem,calc(100vw-1.5rem))] rounded-2xl border-2 border-[#2a1a10] bg-[#fbf1d2] p-3 text-[#2a1a10] shadow-[0_18px_40px_-14px_rgba(0,0,0,0.85)] motion-safe:animate-[chill-pop_0.25s_ease-out] sm:left-5 sm:top-[4.25rem]"
            >
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#9a6a45]">{t.room.menu}</p>
              <p className="mt-0.5 text-base font-semibold leading-snug">{t.room.menuTitle}</p>
              <ul className="mt-2 divide-y divide-dashed divide-[#2a1a10]/25">
                {GUIDE_ORDER.filter((s) => guideCan[s]).map((s) => (
                  <li key={s}>
                    <button
                      type="button"
                      onClick={() => pointAt(s)}
                      className="flex w-full items-start gap-2.5 rounded-lg px-1.5 py-2 text-left transition hover:bg-[#e8b27d]/30 focus-visible:outline-2 focus-visible:outline-[#9a6a45]"
                    >
                      <span
                        aria-hidden
                        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] border-2 border-[#2a1a10] text-[11px] font-bold leading-none ${guideDone[s] ? 'bg-[#e8b27d]' : ''}`}
                      >
                        {guideDone[s] ? '✓' : ''}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold leading-snug">
                          {t.room.menuItems[s].title}
                          {guideDone[s] && <span className="sr-only"> ({t.room.menuDone})</span>}
                        </span>
                        <span className="block text-xs leading-snug text-[#2a1a10]/70">{t.room.menuItems[s].desc}</span>
                      </span>
                      <span aria-hidden className="mt-0.5 text-sm text-[#9a6a45]">
                        →
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[11px] leading-snug text-[#2a1a10]/60">{t.room.menuNote}</p>
              {/* Cài quán thành ứng dụng — ẩn khi đang trong ứng dụng hoặc trình duyệt không cài được */}
              {installMode && (
                <div className="mt-2.5 rounded-xl border-2 border-[#2a1a10] bg-[#e8b27d]/35 p-2.5">
                  <button
                    type="button"
                    aria-expanded={installMode === 'prompt' ? undefined : installHelp}
                    onClick={() => {
                      if (installMode === 'prompt') return void install()
                      if (!installHelp) trackEvent({name: 'Chill Install', props: {action: 'help'}})
                      setInstallHelp((v) => !v)
                    }}
                    className="flex w-full items-center gap-2.5 text-left focus-visible:outline-2 focus-visible:outline-[#9a6a45]"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/chill/app/icon-192.png" alt="" width={36} height={36} className="h-9 w-9 shrink-0 rounded-lg border-2 border-[#2a1a10] [image-rendering:pixelated]" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold leading-snug">{t.install.title}</span>
                      <span className="block text-xs leading-snug text-[#2a1a10]/70">{t.install.desc}</span>
                    </span>
                    <span aria-hidden className="text-sm text-[#9a6a45]">
                      {installMode === 'prompt' ? '↓' : installHelp ? '▴' : '▾'}
                    </span>
                  </button>
                  {installHelp && installMode !== 'prompt' && (
                    <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs leading-snug text-[#2a1a10]/85">
                      {t.install.steps[installMode].map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ol>
                  )}
                </div>
              )}
              {/* Điện thoại: những thứ ít dùng không còn nút riêng trên màn hình → nằm ở đây */}
              <div className="mt-2.5 border-t-2 border-[#2a1a10]/70 pt-2 sm:hidden">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#9a6a45]">{t.room.menuMore}</p>
                <div className="mt-1 grid grid-cols-2 gap-1">
                  {menuMore.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={item.run}
                      className="relative flex items-center gap-1.5 rounded-lg px-1.5 py-1.5 text-left text-[13px] font-semibold leading-snug transition hover:bg-[#e8b27d]/30 focus-visible:outline-2 focus-visible:outline-[#9a6a45]"
                    >
                      <span aria-hidden className="w-4 shrink-0 text-center text-[12px]">
                        {item.icon}
                      </span>
                      <span className="min-w-0 truncate">{item.label}</span>
                      {item.dot && <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-[#d85a30]" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div className="hidden sm:block">
            <ShareButton />
          </div>
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
          {/* Điện thoại: thanh trên đã chật → công tắc nằm trong Settings › Atmosphere */}
          <ZenToggle on={false} onToggle={toggleZen} fresh={!zenSeen} hint={zenHint} onCloseHint={() => setZenHint(false)} className="hidden sm:block" />
          {/* Đồng hồ phin đứng cùng nhóm nút viền cam (Chia sẻ · Có gì mới · Ngắm cảnh); giờ ở
              điểm đến + toàn màn hình là nhóm nền tối ở cuối. Điện thoại: đang đếm thì giờ còn
              lại thế chỗ giờ điểm đến cho thanh trên khỏi tràn.
              Nút dừng cảnh đã chuyển vào Cài đặt › Không khí */}
          <Focus regular={regular} onPrime={primeAudio} onDone={onFocusDone} onBreakDone={onBreakDone} onTick={setFocusLabel} onOpenChange={onFocusOpen} hint={guideOn('phin') ? t.room.guidePhin : null} openSignal={focusSignal} gift={gift} shelfCount={shelfOn ? shelf.owned.length : null} onOpenShelf={() => openShelf(gift ?? undefined)} onStart={onQuestStart} quest={quest ? <QuestCard state={quest} mine={questMine} myVote={questVote} voteError={questVoteErr} onVote={onQuestVote} /> : null} contrib={questJust ? (
            <div className="mt-3 rounded-xl border border-[#e8b27d]/30 bg-[#e8b27d]/[0.07] px-3 py-2.5">
              <p className="text-sm text-[#f3ece4]">{t.quest.added}</p>
              <NameField label={t.name.onBoard} className="mt-1" />
            </div>
          ) : null} />
          <span className="sm:hidden">{menuButton}</span>
          <span className="pointer-events-none hidden h-9 items-center rounded-md bg-black/45 px-2.5 font-mono text-[11px] tabular-nums text-white/90 backdrop-blur sm:flex">
            {clock}
          </span>
          {canMini && (
            <div className="relative hidden sm:block">
              <StageButton label={t.room.miniOpen} onClick={() => (miniWin ? miniWin.close() : openMini('button'))}>
                <MiniPlayerIcon />
              </StageButton>
              {guideOn('mini') && <span aria-hidden className="chill-ring pointer-events-none absolute inset-0 rounded-md border-2 border-[#e8b27d]" />}
              {/* Lời mời làm quen (guide.ts) ngay dưới nút, cùng kiểu bong bóng Ngắm cảnh */}
              {guideOn('mini') && (
                <button
                  type="button"
                  role="status"
                  onClick={() => openMini('guide')}
                  className="absolute right-0 top-full z-40 mt-2 flex w-[min(260px,calc(100vw-24px))] items-start gap-2 rounded-xl border border-[#e8b27d]/30 bg-[#1b1a21]/95 p-3 text-left shadow-[0_16px_40px_-12px_rgba(0,0,0,0.8)] backdrop-blur-md motion-safe:animate-[chill-pop_0.25s_ease-out]"
                >
                  <span aria-hidden className="mt-0.5 text-sm leading-none">
                    🪟
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-mono text-[10px] uppercase tracking-[0.18em] text-[#e8b27d]">{t.room.miniHintLabel}</span>
                    <span className="mt-0.5 block text-sm leading-snug text-[#ede6dd]">{t.room.miniHint}</span>
                    <span className="mt-1 block text-xs text-[#f3cfa8]">{t.room.miniTry}</span>
                  </span>
                </button>
              )}
            </div>
          )}
          {canFullscreen && (
            <span className="hidden sm:contents">
              <StageButton label={fullscreen ? t.room.exitFullscreen : t.room.fullscreen} onClick={toggleFullscreen}>
                {fullscreen ? <ExitFullscreenIcon /> : <FullscreenIcon />}
              </StageButton>
            </span>
          )}
        </div>
      </div>

      {/* Nền tối sau bảng cảm ơn / nhật ký — bấm ra ngoài để đóng */}
      <button
        type="button"
        aria-label={updatesOpen ? t.room.closeUpdates : shelfOpen ? t.shelf.close : t.room.closeBoard}
        tabIndex={-1}
        onClick={() => {
          setBoardOpen(false)
          setUpdatesOpen(false)
          setShelfOpen(false)
        }}
        className={`absolute inset-0 z-30 cursor-default bg-black/55 backdrop-blur-[2px] transition-opacity duration-300 ${
          boardOpen || updatesOpen || shelfOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      {/* Bấm ra ngoài để đóng bảng cài đặt */}
      {panelOpen && (
        <button type="button" aria-label={t.room.closeSettings} onClick={() => setPanelOpen(false)} className="absolute inset-0 z-10 cursor-default" />
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
              <RoundButton label={t.room.prev} onClick={prev}>
                <PrevIcon />
              </RoundButton>
              <button
                type="button"
                onClick={togglePlay}
                aria-label={playing ? t.room.pause : t.room.play}
                title={`${playing ? t.room.pause : t.room.play} (Space)`}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-[#e8b27d] text-[#2a1a10] transition hover:bg-[#f0c294] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e8b27d]"
              >
                {playing ? <PauseIcon /> : <PlayIcon />}
              </button>
              <RoundButton label={t.room.next} onClick={next}>
                <NextIcon />
              </RoundButton>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-mono text-[10px] uppercase tracking-[0.2em] text-[#a79e94]">
                {stationLabel} · {playingPos + 1}/{playingList.length}
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
              aria-label={t.room.volume}
              className="hidden w-24 accent-[#e8b27d] md:block"
            />
            {/* Điện thoại không đủ chỗ cho thanh volume — nút loa mở thanh trượt nổi phía trên */}
            <div className="relative md:hidden">
              <button
                type="button"
                onClick={() => setVolumeOpen((o) => !o)}
                aria-label={t.room.volume}
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
                    aria-label={t.room.volume}
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
                aria-label={t.room.settings}
                aria-expanded={panelOpen}
                aria-controls="chill-panel"
                aria-describedby={showHintTip ? 'chill-settings-hint' : undefined}
                title={`${t.room.settings} (S)`}
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
                  {t.room.settingsTip}
                </button>
              )}
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2 font-mono text-[10px] tabular-nums text-[#a79e94]">
            <span className="w-8">{formatTime(position)}</span>
            <div
              role="slider"
              tabIndex={-1}
              aria-label={t.room.seek}
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

      {/* Hàng nút góc phải dưới, theo thứ tự Nhật ký · Wishlist · Mời bạn · Chat. Mỗi component tự
          đặt nút của mình vào đúng ô (portal) nên thứ tự luôn cố định; ô trống (chat bị
          Studio tắt, phòng không phải café) thì hàng tự dồn lại.
          Điện thoại / màn dọc: hàng ngang nút tròn gọn ngay trên thanh nhạc.
          Màn ngang ≥1024px: cột dọc sát mép phải, đáy ngang đáy thanh nhạc (khoảng trống
          bên phải thanh nhạc đủ rộng cho cột) — không đè thanh nhạc, ít che người ngồi */}
      <div className="absolute right-3 z-30 flex items-center gap-2.5 bottom-[calc(max(0.75rem,env(safe-area-inset-bottom))+104px)] sm:right-5 sm:bottom-[124px] lg:bottom-5 lg:flex-col lg:items-end">
        <div ref={setDiarySlot} className="contents" />
        {/* Điện thoại: Góp ý + Mời bạn nằm trong Thực đơn; đang ngồi bàn nhóm thì nút bàn vẫn ở đây */}
        <div ref={setWishSlot} className="hidden sm:contents" />
        <div ref={setInviteSlot} className={tableMembers ? 'contents' : 'hidden sm:contents'} />
        <div ref={setChatSlot} className="contents" />
      </div>

      {/* Bàn nhóm (thử nghiệm) — Studio tắt thì không hiện gì */}
      <GroupTable
        visible={theme === 'cafe'}
        slot={inviteSlot}
        dimmed={hideUi}
        hidden={!entered || panelOpen || volumeOpen || showHintTip}
        onTable={onTable}
        onView={() => setGroupView(true)}
        openSignal={tableSignal}
        onAvailable={setTableAvailable}
        seat={shownSeat}
      />

      <Wishlist
        slot={wishSlot}
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
        hidden={!entered || panelOpen || volumeOpen || showHintTip}
        ready={entered}
        context={`${dest.name} · ${timeLabel} · ${weatherLabel} · ${track.title}`}
        onThanks={thankCat}
        donateRequest={donateRequest}
      />

      {/* Bảng nhật ký (thử nghiệm) — Studio tắt thì không hiện gì */}
      <Diary
        slot={diarySlot}
        open={diaryOpen}
        onOpenChange={(o) => {
          if (o) {
            setPanelOpen(false)
            setWishOpen(false)
            setChatOpen(false)
            setBoardOpen(false)
            setUpdatesOpen(false)
          }
          if (o) markTried('diary')
          setDiaryOpen(o)
        }}
        dimmed={hideUi}
        hidden={!entered || panelOpen || volumeOpen || showHintTip}
        slipHidden={groupView}
        hint={guideOn('diary') ? t.room.guideDiary : null}
        onAvailable={setDiaryAvailable}
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
        hidden={!entered || panelOpen || volumeOpen || showHintTip}
        dimmed={hideUi}
        onAvailable={setChatAvailable}
        slot={chatSlot}
        onMessages={onChatMessages}
        fastPoll={Boolean(tableMembers?.some((m) => !m.you))}
        shareTyping={Boolean(tableMembers?.some((m) => !m.you))}
        onSentText={onSentText}
        listening={playing}
        onOnline={setOnline}
      />

      {shelfOn && (
        <Shelf
          open={shelfOpen}
          onClose={() => setShelfOpen(false)}
          phins={regular.phins}
          onBrew={() => {
            setShelfOpen(false)
            setFocusSignal((n) => n + 1)
          }}
          state={shelf}
          selected={shelfPick}
          onSelect={(id) => {
            setShelfPick(id)
            setShelf((s) => markSeen(s, id))
          }}
          onToggle={(id) => setShelf((s) => toggleShown(s, id))}
          slots={themeById(theme).shelf.length}
          placeName={(id) => destinations.find((d) => d.id === id)?.name ?? ''}
        />
      )}

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
        canAction={(action) => action !== 'mini' || canMini}
      />

      {/* Bảng cài đặt: sheet trượt lên trên điện thoại, drawer bên phải trên desktop.
          Chia 3 tab (Music · Scene · Atmosphere) để mỗi tab vừa 1 màn hình, không phải cuộn dài */}
      <aside
        id="chill-panel"
        aria-label={t.room.panel}
        inert={!panelOpen}
        className={`absolute inset-x-0 bottom-0 z-30 flex h-[75dvh] flex-col rounded-t-2xl border-t border-white/10 bg-[#16131a]/95 backdrop-blur-md transition-transform duration-300 ease-out sm:inset-x-auto sm:inset-y-0 sm:right-0 sm:h-auto sm:w-[420px] sm:rounded-none sm:border-l sm:border-t-0 ${
          panelOpen ? 'translate-x-0 translate-y-0' : 'translate-y-full sm:translate-x-full sm:translate-y-0'
        }`}
      >
        <div className="flex items-center justify-between gap-4 px-5 pb-3 pt-4">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-[#e8b27d]">Chill for work</p>
          <LangSwitch className="ml-auto" />
          <RoundButton label={`${t.room.closeSettings} (Esc)`} onClick={() => setPanelOpen(false)}>
            <CloseIcon />
          </RoundButton>
        </div>

        {/* Tab chính kiểu gạch chân — khác hẳn chip chọn trạm nhạc bên trong tab Music */}
        <div
          role="tablist"
          aria-label={t.room.settings}
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
          {PANEL_TABS.map((tab) => {
            const on = tab.id === panelTab
            return (
              <button
                key={tab.id}
                id={`chill-tab-${tab.id}`}
                type="button"
                role="tab"
                aria-selected={on}
                aria-controls={`chill-tabpanel-${tab.id}`}
                tabIndex={on ? 0 : -1}
                onClick={() => setPanelTab(tab.id)}
                className={`relative flex min-w-0 items-center justify-center gap-2 px-2 py-3 text-sm transition focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#e8b27d] ${
                  on ? 'font-semibold text-[#f3cfa8]' : 'text-[#a79e94] hover:text-[#ede6dd]'
                }`}
              >
                {tab.icon}
                <span className="truncate">{t.room.tabs[tab.id]}</span>
                {tab.id === 'atmosphere' && wallFresh && <NewDot />}
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
              <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={t.room.stationAria}>
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
                  {t.room.shuffle}
                </button>
              </div>

              <ol className="mt-3 divide-y divide-white/[0.06] border-t border-white/[0.06]">
                {stationList.map(({tr, i}, pos) => {
                  const active = i === index
                  return (
                    <li key={tr.id}>
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
                          <span className={`block truncate text-sm font-medium ${active ? 'text-[#f3cfa8]' : ''}`}>{tr.title}</span>
                          <span className="block truncate text-xs text-[#a79e94]">{tr.mood}</span>
                        </span>
                        <span className="flex flex-col items-end">
                          <span className="font-mono text-xs tabular-nums text-[#a79e94]">{tr.duration ? formatTime(tr.duration) : '–:––'}</span>
                          {playCountsOn && (playCounts[tr.id] ?? 0) >= PLAY_COUNT_SHOW && (
                            <span className="whitespace-nowrap text-[11px] tabular-nums text-[#a79e94]/80">
                              {t.room.plays(formatPlays(playCounts[tr.id], lang))}
                            </span>
                          )}
                        </span>
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
                <SectionTitle index="01" title={t.room.roomTitle} />
                <div className="mt-3 grid grid-cols-3 gap-2" role="radiogroup" aria-label={t.room.roomTitle}>
                  {THEMES.map((th) => {
                    const active = th.id === theme
                    return (
                      <button
                        key={th.id}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => setTheme(th.id)}
                        className={`group overflow-hidden rounded-xl border text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e8b27d] ${
                          active ? 'border-[#e8b27d]/70 ring-1 ring-[#e8b27d]/40' : 'border-white/10 hover:border-white/25'
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element -- ảnh nội thất nhỏ, đã có sẵn */}
                        <img
                          src={th.thumb}
                          alt=""
                          loading="lazy"
                          className={`aspect-video w-full object-cover [image-rendering:pixelated] transition duration-300 ${active ? '' : 'opacity-70 group-hover:opacity-100'}`}
                        />
                        <span className="block truncate px-2 py-1.5 text-xs font-semibold text-[#ede6dd]">{t.room.themes[th.id]}</span>
                      </button>
                    )
                  })}
                </div>
                {seatPickOn && (
                  <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
                    <span className="text-sm text-[#a79e94]">{t.room.seatTitle}</span>
                    <SeatPicker seat={seat} onPick={setSeat} label={t.room.seatTitle} names={t.room.seats} />
                    {seat === 'girl' && !hasGirl(theme) && <p className="w-full text-xs text-[#a79e94]">{t.room.seatNoGirl}</p>}
                  </div>
                )}
              </section>

              <section>
                <SectionTitle index="02" title={t.room.destination} />
                {/* Chọn điểm đến bằng thẻ có ảnh phố (đúng giờ đang chọn) thay cho <select> gốc */}
                <div className="mt-3 grid grid-cols-3 gap-2" role="radiogroup" aria-label={t.room.destination}>
                  {destinations.map((d, i) => {
                    const active = i === destIndex
                    return (
                      <button
                        key={d.id}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => {
                          if (!active) trackEvent({name: 'Chill Place', props: {place: d.id, how: 'pick'}})
                          goTo(i)
                        }}
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
                            {t.room.now}
                          </span>
                        )}
                        <span className="block truncate px-2 py-1.5 text-xs font-semibold text-[#ede6dd]">{d.name}</span>
                      </button>
                    )
                  })}
                </div>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <span id="chill-travel" className="text-sm text-[#a79e94]">
                    {t.room.autoTravel}
                  </span>
                  <div role="radiogroup" aria-labelledby="chill-travel" className="flex rounded-full border border-white/10 bg-black/20 p-0.5">
                    {TRAVEL_OPTIONS.map((o) => (
                      <button
                        key={o.value}
                        type="button"
                        role="radio"
                        aria-checked={travel === o.value}
                        onClick={() => {
                          // Tắt chuyển ga khi đang ở cảnh này = muốn dừng lại ở đây
                          if (!o.value && travel) trackEvent({name: 'Chill Place', props: {place: dest.id, how: 'stop'}})
                          setTravel(o.value)
                          travelRef.current = 0
                          setTravelElapsed(0)
                        }}
                        className={`rounded-full px-3 py-1 text-xs transition focus-visible:outline-2 focus-visible:outline-[#e8b27d] ${
                          travel === o.value ? 'bg-[#e8b27d] font-semibold text-[#2a1a10]' : 'text-[#c9c0b6] hover:text-[#ede6dd]'
                        }`}
                      >
                        {o.value ? t.room.travelMin(o.value) : t.room.travelOff}
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
                  {String(destIndex + 1).padStart(2, '0')} / {String(destinations.length).padStart(2, '0')} · {t.room.nextStop(nextDest.name)}
                </p>
              </section>
            </div>
          )}

          {panelTab === 'atmosphere' && (
            <div className="space-y-4">
              <SwitchRow title={t.zen.name} desc={zen ? t.zen.descOn : t.zen.desc} on={zen} onToggle={toggleZen} />
              <Field label={t.room.time}>
                <Segmented options={TIMES.map((o) => ({...o, label: t.room.times[o.value]}))} value={time} onChange={setTime} />
              </Field>
              <Field label={t.room.weather}>
                <Segmented options={WEATHERS.map((o) => ({...o, label: t.room.weathers[o.value]}))} value={weather} onChange={setWeather} />
              </Field>
              {theme === 'cafe' && (
                <Field
                  label={
                    <>
                      {t.room.tableWall}
                      {wallFresh && <NewDot />}
                    </>
                  }
                >
                  <div>
                    <Segmented options={WALLS.map((o) => ({...o, label: t.room.walls[o.value]}))} value={groupWall} onChange={chooseWall} />
                    {/* Chỉ thấy ở bàn nhóm → nói rõ tác dụng, dẫn tới chỗ xem được */}
                    {!groupView && (
                      <p className="mt-1.5 text-xs text-[#a79e94]">
                        {tableMembers ? t.room.wallSeeNow : t.room.wallBehind}
                        <button
                          type="button"
                          onClick={() => {
                            if (tableMembers) {
                              setGroupView(true)
                              // Điện thoại: bảng cài đặt che gần hết cảnh → đóng lại để xem
                              if (!window.matchMedia('(min-width: 1024px)').matches) setPanelOpen(false)
                            } else {
                              setPanelOpen(false)
                              setTableSignal((n) => n + 1)
                            }
                          }}
                          className="text-[#e8b27d] underline-offset-2 transition hover:text-[#f3cfa8] hover:underline"
                        >
                          {tableMembers ? t.room.goToTable : t.room.inviteFriends}
                        </button>
                      </p>
                    )}
                  </div>
                </Field>
              )}
              <SwitchRow title={t.room.pauseScene} desc={t.room.pauseSceneDesc} on={scenePaused} onToggle={() => setScenePaused((p) => !p)} />
              {/* Bộ trộn âm nền (mix.ts): bản trộn có sẵn + mỗi tiếng 1 thanh */}
              {/* Cả khối rộng hết bảng (không chia cột nhãn như Field) cho thanh trượt đủ dài */}
              <div>
                <p className="mb-2 text-sm text-[#a79e94]">{t.room.ambienceLabel}</p>
                <div className="flex flex-wrap gap-1.5" role="group" aria-label={t.mix.presetsAria}>
                  {(['scene', 'busy', 'rainyNight', 'quiet'] as const).map((id) => (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={mixPreset === id}
                      onClick={() => choosePreset(id)}
                      className={`rounded-full border px-3 py-1.5 text-xs transition focus-visible:outline-2 focus-visible:outline-[#e8b27d] ${
                        mixPreset === id ? 'border-[#e8b27d]/70 bg-[#e8b27d]/15 text-[#f3cfa8]' : 'border-white/10 text-[#c9c0b6] hover:bg-white/[0.06] hover:text-[#ede6dd]'
                      }`}
                    >
                      {t.mix.presets[id]}
                    </button>
                  ))}
                  {mixPreset === 'custom' && (
                    <span className="rounded-full border border-[#e8b27d]/70 bg-[#e8b27d]/15 px-3 py-1.5 text-xs text-[#f3cfa8]">{t.mix.custom}</span>
                  )}
                </div>
                <div className="mt-3 space-y-2.5">
                  {MIX_CHANNELS.map((c) => (
                    <label key={c} className="flex items-center gap-3">
                      <span aria-hidden className="w-5 shrink-0 text-center text-sm">
                        {MIX_ICONS[c]}
                      </span>
                      <span className="w-20 shrink-0 text-xs text-[#c9c0b6]">{t.mix.channels[c]}</span>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={mixShown[c]}
                        onChange={(e) => changeChannel(c, Number(e.target.value))}
                        aria-label={t.mix.channelAria(t.mix.channels[c])}
                        aria-valuetext={`${Math.round(mixShown[c] * 100)}%`}
                        className="w-full accent-[#e8b27d]"
                      />
                      <span className="w-9 shrink-0 text-right font-mono text-[11px] tabular-nums text-[#a79e94]">{Math.round(mixShown[c] * 100)}</span>
                    </label>
                  ))}
                </div>
                <div className="mt-2.5 flex items-center justify-between gap-3">
                  <p className="text-xs leading-snug text-[#a79e94]">{mix ? t.mix.customHint : t.mix.sceneHint(ambienceLabel)}</p>
                  <button
                    type="button"
                    onClick={() => choosePreset('mute')}
                    className="shrink-0 rounded-full border border-white/10 px-2.5 py-1 text-xs text-[#c9c0b6] transition hover:bg-white/[0.06] hover:text-[#ede6dd] focus-visible:outline-2 focus-visible:outline-[#e8b27d]"
                  >
                    {t.mix.muteAll}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Đáy cố định: phím tắt (desktop) + credit */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-white/[0.06] px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] font-mono text-[11px] text-[#a79e94]">
          {[
            ['Space', t.room.keys.play],
            ['N / P', t.room.keys.nextPrev],
            ['F', t.room.keys.fullscreen],
            ['S', t.room.keys.settings],
          ].map(([key, label]) => (
            <span key={key} className="hidden sm:inline">
              <kbd className="rounded border border-white/15 px-1.5 py-0.5 text-[#ede6dd]">{key}</kbd> {label}
            </span>
          ))}
          <span className="uppercase tracking-[0.2em] text-white/30 sm:basis-full">{t.room.credit}</span>
          <span className="text-white/30 sm:basis-full">
            {t.room.emojiCredit}{' '}
            <a
              href="https://googlefonts.github.io/noto-emoji-animation/"
              target="_blank"
              rel="noreferrer"
              className="underline-offset-2 transition hover:text-[#ede6dd] hover:underline"
            >
              Noto Emoji
            </a>{' '}
            (CC BY 4.0)
          </span>
          <span className="text-white/30 sm:basis-full">
            <Link href="/chill/terms" className="underline-offset-2 transition hover:text-[#ede6dd] hover:underline">
              {t.room.terms}
            </Link>
            {' · '}
            <Link href="/chill/privacy" className="underline-offset-2 transition hover:text-[#ede6dd] hover:underline">
              {t.room.privacy}
            </Link>
          </span>
        </div>
      </aside>
      </div>

      {/* Màn chào: cảnh + 1 lời mời + 1 nút lớn. Bấm bất kỳ đâu là vào quán và nhạc chạy
          (trình duyệt chỉ cho phát tiếng sau 1 cú bấm). Mọi nút khác chờ sau bước này.
          Màn dọc: chữ nằm trên cảnh, nút nằm dưới cảnh — không che người ngồi */}
      {!welcomeGone && (
        <div
          inert={entered}
          onClick={() => enter(true)}
          onTransitionEnd={(e) => entered && e.target === e.currentTarget && setWelcomeGone(true)}
          className={`absolute inset-0 z-50 flex cursor-pointer flex-col items-center justify-end gap-6 bg-gradient-to-t from-black/90 via-black/55 to-transparent px-6 pb-[max(2.5rem,9dvh)] text-center transition-opacity duration-500 portrait:justify-between portrait:bg-[linear-gradient(to_bottom,rgba(0,0,0,0.85),rgba(0,0,0,0.55)_36%,transparent_48%,transparent_60%,rgba(0,0,0,0.75))] portrait:pb-[max(1.5rem,6dvh)] portrait:pt-[11dvh] ${
            entered ? 'pointer-events-none opacity-0' : 'opacity-100'
          }`}
        >
          <div className="absolute inset-x-0 top-0 flex cursor-default items-center justify-between gap-3 p-3 sm:p-5" onClick={(e) => e.stopPropagation()}>
            <Link
              href="/"
              aria-label={t.welcome.home}
              className="flex h-9 items-center gap-1.5 rounded-md bg-black/45 px-2.5 text-xs text-white/90 backdrop-blur transition hover:bg-black/65 focus-visible:outline-2 focus-visible:outline-[#e8b27d]"
            >
              <ArrowIcon dir="left" />
              Bin Nguyen
            </Link>
            <LangSwitch />
          </div>
          <div className="max-w-xl">
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#e8b27d]">Chill for work</p>
            <h2 className="mt-3 text-balance text-2xl font-semibold leading-tight tracking-tight text-white [text-shadow:0_2px_16px_rgba(0,0,0,0.7)] sm:text-4xl">
              {returning ? t.welcome.titleBack : t.welcome.title}
            </h2>
            <p className="mx-auto mt-3 max-w-md text-pretty text-sm leading-relaxed text-[#ede6dd] [text-shadow:0_1px_10px_rgba(0,0,0,0.8)] sm:text-base">{t.welcome.sub}</p>
          </div>
          <div className="flex flex-col items-center gap-2">
            {returning && visitDayOf(regular) >= 2 && (
              <p className="mb-1 flex items-center gap-1.5 rounded-full border border-[#e8b27d]/40 bg-black/50 px-3 py-1 text-xs text-[#f3cfa8] backdrop-blur">
                <PawIcon />
                {t.welcome.visit(visitDayOf(regular), t.regular.levels[levelOf(visitDayOf(regular))])}
              </p>
            )}
            {seatPickOn && hasGirl(theme) && (
              // Chọn người ngồi — không tính là "vào quán" (cả màn chào bắt click)
              <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} className="mb-1 flex flex-col items-center gap-1.5">
                <p className="text-xs text-white/80 [text-shadow:0_1px_8px_rgba(0,0,0,0.8)]">{t.welcome.seat}</p>
                <SeatPicker seat={seat} onPick={setSeat} label={t.welcome.seat} names={t.room.seats} />
              </div>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                enter(true)
              }}
              // Trang chưa tải xong script thì bấm chưa có tác dụng → nút mờ + con trỏ chờ
              aria-busy={!loaded}
              className={`flex min-h-14 items-center gap-3 rounded-full bg-[#e8b27d] py-2 pl-5 pr-7 text-base font-semibold text-[#2a1a10] shadow-[0_16px_40px_-12px_rgba(232,178,125,0.7)] transition hover:bg-[#f0c294] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#e8b27d] motion-safe:hover:scale-[1.03] ${
                loaded ? '' : 'cursor-progress opacity-60'
              }`}
            >
              <PlayIcon />
              {t.welcome.enter}
            </button>
            <p className="mt-1 max-w-[80vw] truncate font-mono text-[10px] uppercase tracking-[0.2em] text-white/70">
              ♪ {stationLabel} · {track.title}
            </p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                enter(false)
              }}
              className="flex min-h-11 items-center px-3 text-xs text-white/75 underline underline-offset-4 transition hover:text-white focus-visible:outline-2 focus-visible:outline-[#e8b27d]"
            >
              {t.welcome.look}
            </button>
            {/* Tên ngồi quán (tạo sẵn ngẫu nhiên), bấm "đổi tên" để sửa — không tính là "vào quán" */}
            <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} className="[text-shadow:0_1px_8px_rgba(0,0,0,0.8)]">
              <NameField label={t.name.welcome} className="justify-center text-white/75" />
            </div>
            {/* Bấm link không được tính là "vào quán" (cả màn chào bắt click) */}
            <p className="mt-1 text-[10px] text-white/45" onClick={(e) => e.stopPropagation()}>
              <Link href="/chill/terms" className="underline-offset-2 transition hover:text-white hover:underline">
                {t.room.terms}
              </Link>
              {' · '}
              <Link href="/chill/privacy" className="underline-offset-2 transition hover:text-white hover:underline">
                {t.room.privacy}
              </Link>
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// Công tắc ngôn ngữ EN / VI (màn chào + đầu bảng cài đặt)
function LangSwitch({className = ''}: {className?: string}) {
  const lang = useLang()
  const t = useT()
  const choose = (next: Lang) => {
    if (next === lang) return
    setLang(next)
    trackEvent({name: 'Chill Lang', props: {lang: next}})
  }
  return (
    <div role="radiogroup" aria-label={t.common.language} className={`flex shrink-0 rounded-md border border-white/15 bg-black/45 p-0.5 backdrop-blur ${className}`}>
      {(['en', 'vi'] as const).map((l) => (
        <button
          key={l}
          type="button"
          role="radio"
          aria-checked={lang === l}
          aria-label={l === 'en' ? 'English' : 'Tiếng Việt'}
          onClick={() => choose(l)}
          className={`h-8 min-w-9 rounded px-2 font-mono text-[11px] uppercase tracking-[0.12em] transition focus-visible:outline-2 focus-visible:outline-[#e8b27d] ${
            lang === l ? 'bg-[#e8b27d] font-semibold text-[#2a1a10]' : 'text-white/80 hover:text-white'
          }`}
        >
          {l}
        </button>
      ))}
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

// Chọn người ngồi nam / nữ: 2 nút có mặt nhân vật, cắt từ ảnh nội thất phòng Cửa sổ quán
// (vùng đầu người ngồi, px 1280: x 980–1140, y 270–430)
const SEAT_FACES: Record<Seat, string> = {boy: '/chill/scenes/interior.webp', girl: '/chill/scenes/interior-girl.webp'}

function SeatPicker({seat, onPick, label, names}: {seat: Seat; onPick: (s: Seat) => void; label: string; names: Record<Seat, string>}) {
  return (
    <div className="flex gap-1 rounded-full bg-black/45 p-1 backdrop-blur" role="radiogroup" aria-label={label}>
      {SEATS.map((s) => {
        const active = s === seat
        return (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onPick(s)}
            className={`flex min-h-9 items-center gap-2 rounded-full py-1 pl-1 pr-3.5 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e8b27d] ${
              active ? 'bg-[#e8b27d] text-[#2a1a10]' : 'text-white/80 hover:bg-white/10 hover:text-white'
            }`}
          >
            <span
              aria-hidden
              className="block size-7 shrink-0 rounded-full bg-[#c4d6e2] bg-no-repeat [image-rendering:pixelated]"
              style={{backgroundImage: `url(${SEAT_FACES[s]})`, backgroundSize: '224px 126px', backgroundPosition: '-171px -47px'}}
            />
            {names[s]}
          </button>
        )
      })}
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

function Field({label, children}: {label: React.ReactNode; children: React.ReactNode}) {
  return (
    <div className="grid items-center gap-2 sm:grid-cols-[6rem_minmax(0,1fr)]">
      <span className="flex items-center gap-1.5 text-sm text-[#a79e94]">{label}</span>
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
    <div className={`grid gap-1 rounded-xl border border-white/10 p-1 ${options.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
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

// Rãnh gạt dùng chung: tắt = rãnh nâu tối viền mảnh + núm be; bật = rãnh hổ phách (cùng
// tông nút Play) + núm tối. Màu rãnh và vị trí núm đổi CÙNG lúc — không có khoảnh khắc
// rãnh đã sáng mà núm còn nằm bên trái. sm: 36×20 núm 14 · lg: 44×26 núm 20
function SwitchTrack({on, size = 'sm'}: {on: boolean; size?: 'sm' | 'lg'}) {
  const lg = size === 'lg'
  return (
    <span
      aria-hidden
      className={`relative inline-flex shrink-0 items-center rounded-full border transition-colors duration-200 ${lg ? 'h-[26px] w-11' : 'h-5 w-9'} ${
        on ? 'border-[#e8b27d] bg-[#e8b27d]' : 'border-white/20 bg-[#3a2a1e]'
      }`}
    >
      <span
        className={`absolute left-[2px] rounded-full shadow-[0_1px_2px_rgba(0,0,0,0.4)] transition-[transform,background-color] duration-200 ${lg ? 'h-5 w-5' : 'h-3.5 w-3.5'} ${
          on ? `bg-[#2a1a10] ${lg ? 'translate-x-[18px]' : 'translate-x-4'}` : 'translate-x-0 bg-[#e8dccb]'
        }`}
      />
    </span>
  )
}

// Công tắc "Ngắm cảnh" (chế độ Zen) trên thanh trên: cả khung là một công tắc
// (role="switch"), bấm chữ hay rãnh đều gạt được. `fresh` = chưa bật lần nào → chấm cam +
// vòng sáng; `hint` = bong bóng giới thiệu 1 lần; `floating` = bản nổi trong Zen (điện
// thoại cao 44px cho dễ chạm)
function ZenToggle({
  on,
  onToggle,
  fresh = false,
  hint = false,
  onCloseHint,
  floating = false,
  className = '',
}: {
  on: boolean
  onToggle: () => void
  fresh?: boolean
  hint?: boolean
  onCloseHint?: () => void
  floating?: boolean
  className?: string
}) {
  const t = useT()
  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={t.zen.aria}
        title={on ? t.zen.titleOn : `${t.zen.desc} (H)`}
        onClick={onToggle}
        className={`relative flex items-center gap-2.5 rounded-md border border-[#e8b27d]/45 bg-[#2a1f18]/80 pl-3 pr-2 text-xs font-medium text-[#f6dcbd] shadow-[0_4px_14px_-6px_rgba(0,0,0,0.8)] backdrop-blur transition hover:border-[#e8b27d]/80 hover:bg-[#3a2a1e]/85 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e8b27d] ${
          floating ? 'h-11 sm:h-9' : 'h-9'
        }`}
      >
        {fresh && <span aria-hidden className="chill-ring pointer-events-none absolute inset-0 rounded-md border-2 border-[#e8b27d]" />}
        <span>{t.zen.name}</span>
        <SwitchTrack on={on} />
        {fresh && (
          <span aria-hidden className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-[#f08a5d] opacity-60 motion-safe:animate-ping" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full border border-black/40 bg-[#f08a5d]" />
          </span>
        )}
      </button>

      {/* Bong bóng giới thiệu ngay dưới công tắc, cùng kiểu thông báo "Có gì mới" */}
      <div
        role="status"
        className={`absolute right-0 top-full z-40 mt-2 w-[min(280px,calc(100vw-24px))] transition duration-300 ${
          hint ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-1 opacity-0'
        }`}
      >
        {hint && (
          <div className="flex items-start gap-2 rounded-xl border border-[#e8b27d]/30 bg-[#1b1a21]/95 p-3 text-left shadow-[0_16px_40px_-12px_rgba(0,0,0,0.8)] backdrop-blur-md">
            <span aria-hidden className="mt-0.5 text-sm leading-none">
              🍃
            </span>
            <button type="button" onClick={onToggle} className="min-w-0 flex-1 text-left">
              <span className="block font-mono text-[10px] uppercase tracking-[0.18em] text-[#e8b27d]">{t.zen.newLabel}</span>
              <span className="mt-0.5 block text-sm leading-snug text-[#ede6dd]">{t.zen.desc}</span>
              <span className="mt-1 block text-xs text-[#f3cfa8] underline-offset-2 hover:underline">{t.zen.tryIt}</span>
            </button>
            <button
              type="button"
              onClick={onCloseHint}
              aria-label={t.common.hideTip}
              className="-mr-1 -mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[#a79e94] transition hover:bg-white/10 hover:text-[#ede6dd]"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
                <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// Dòng công tắc trong bảng cài đặt ("Ngắm cảnh" — chủ yếu cho điện thoại vì thanh trên đã
// chật — và "Dừng cảnh"): cả dòng cao 56px là một công tắc, rãnh 44×26
function SwitchRow({title, desc, on, onToggle}: {title: string; desc: string; on: boolean; onToggle: () => void}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      className="flex min-h-14 w-full items-center gap-4 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-left transition hover:bg-white/[0.06] focus-visible:outline-2 focus-visible:outline-[#e8b27d]"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-[#ede6dd]">{title}</span>
        <span className="block text-xs text-[#a79e94]">{desc}</span>
      </span>
      <SwitchTrack on={on} size="lg" />
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

function MiniPlayerIcon() {
  return (
    <svg {...iconProps} width={14} height={14}>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <rect x="12" y="12" width="7" height="5" rx="1" fill="currentColor" stroke="none" />
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

// Chấm cam "tính năng mới" nhỏ, nằm cạnh chữ
function NewDot() {
  const t = useT()
  return (
    <span aria-label={t.common.isNew} className="relative inline-flex h-2 w-2 shrink-0">
      <span className="absolute inline-flex h-full w-full rounded-full bg-[#f08a5d] opacity-60 motion-safe:animate-ping" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-[#f08a5d]" />
    </span>
  )
}

function BrickIcon() {
  return (
    <svg {...iconProps}>
      <path d="M3 5h18v14H3zM3 9.7h18M3 14.3h18M9 5v4.7M15 5v4.7M6 9.7v4.6M12 9.7v4.6M18 9.7v4.6M9 14.3V19M15 14.3V19" />
    </svg>
  )
}

function GlassIcon() {
  return (
    <svg {...iconProps}>
      <path d="M3 4h18v16H3zM12 4v16M3 9h18M6 17l3-3M14.5 17l4-4" />
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
  const t = useT()
  return (
    <span className="flex h-3 items-end gap-[2px]" aria-label={t.room.playing}>
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

function MenuCardIcon() {
  return (
    <svg width="12" height="14" viewBox="0 0 12 14" fill="none" aria-hidden shapeRendering="crispEdges">
      <rect x="1" y="1" width="10" height="12" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3.5 4.5h5M3.5 7h5M3.5 9.5h3" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  )
}
