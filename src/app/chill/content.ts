import {DESTINATIONS, type Destination} from '@/components/chill/destinations'
import {STATIONS, TRACKS, type StationId, type Track} from '@/components/chill/tracks'
import {sanityFetch} from '@/sanity/lib/fetch'
import type {ChillUpdate} from '@/components/chill/Changelog'
import type {NeonSign} from '@/components/chill/facade'

// Nội dung của /chill và /chill/embed: nhạc, điểm đến, nhật ký thay đổi.
//
// Nhạc + điểm đến quản lý trong Sanity Studio. Code (tracks.ts / destinations.ts)
// chỉ còn vài bài + Hà Nội dự phòng, dùng khi Sanity không trả về gì.
// Chỉ lấy bản đã đủ file/ảnh và không bị "Ẩn khỏi trang" — riêng điểm đến, máy dev
// bật CHILL_DEV_HIDDEN=1 thì lấy cả điểm đến đang ẩn để thử (vd cảnh mới chưa mở cho khách).
const CHILL_QUERY = `{
  "tracks": *[_type == "chillTrack" && hidden != true && (defined(audio.asset) || defined(localFile))]
    | order(select(station == "acoustic" => 0, station == "focus" => 1, station == "sax" => 2, station == "lofi" => 3, station == "study" => 4, 5) asc,
            coalesce(order, 9999) asc, _createdAt asc) {
    "id": coalesce(key.current, _id),
    title,
    mood,
    station,
    duration,
    "src": coalesce(audio.asset->url, localFile)
  },
  "destinations": *[_type == "chillDestination" && ($showHidden || hidden != true) && defined(slug.current)
    && defined(morning.asset) && defined(afternoon.asset) && defined(night.asset)]
    | order(coalesce(order, 9999) asc, _createdAt asc) {
    "id": slug.current,
    name,
    region,
    timeZone,
    tilt,
    laneShift,
    scenery,
    "morning": morning.asset->url,
    "afternoon": afternoon.asset->url,
    "night": night.asset->url,
    "minWidth": math::min([morning.asset->metadata.dimensions.width, afternoon.asset->metadata.dimensions.width, night.asset->metadata.dimensions.width]),
    "signs": signs[defined(text)]{text, x, y, color, mode}
  },
  "updates": *[_type == "chillUpdate" && defined(title) && defined(date) && count(items) > 0]
    | order(date desc, _createdAt desc)[0...12] {
    "id": _id,
    title,
    titleEn,
    date,
    kind,
    version,
    announce,
    action,
    actionLabel,
    actionLabelEn,
    "items": items[defined(text)]{icon, text, textEn},
    "image": image.asset->{url, mimeType, "w": metadata.dimensions.width, "h": metadata.dimensions.height},
    "imageAlt": image.alt,
    "imageAltEn": image.altEn
  },
  "shelfOpen": *[_id == "chillSettings"][0].shelfOpen,
  "playCountsOpen": *[_id == "chillSettings"][0].playCountsOpen,
  "questOpen": *[_id == "chillSettings"][0].questOpen,
  "catToyOpen": *[_id == "chillSettings"][0].catToyOpen,
  "seatPickOpen": *[_id == "chillSettings"][0].seatPickOpen,
  "streetMotionOpen": *[_id == "chillSettings"][0].streetMotionOpen,
  "miniPlayerOpen": *[_id == "chillSettings"][0].miniPlayerOpen,
  "facadeOpen": *[_id == "chillSettings"][0].facadeOpen,
  "highlandOpen": *[_id == "chillSettings"][0].highlandOpen
}`

type ChillContent = {
  tracks: {id: string; title: string; mood?: string; station?: string; duration?: number; src: string}[]
  destinations: {
    id: string
    name: string
    region?: string
    timeZone?: string
    tilt?: number
    laneShift?: number
    scenery?: string
    morning: string
    afternoon: string
    night: string
    minWidth?: number | null
    signs?: NeonSign[] | null
  }[]
  shelfOpen?: boolean | null
  playCountsOpen?: boolean | null
  questOpen?: boolean | null
  catToyOpen?: boolean | null
  seatPickOpen?: boolean | null
  streetMotionOpen?: boolean | null
  miniPlayerOpen?: boolean | null
  facadeOpen?: boolean | null
  highlandOpen?: boolean | null
  updates: (Omit<ChillUpdate, 'image'> & {image?: {url: string; mimeType?: string; w?: number; h?: number} | null})[]
}

// Sanity CDN tự cắt/thu nhỏ ảnh về đúng khung phố của canvas (560×238)
const sceneUrl = (url: string) => `${url}?w=560&h=238&fit=crop&fm=webp&q=90`
// Bản nét (1120×476 = 4 px mỗi ô lưới, đúng mật độ sprite) — chỉ khi cả 3 ảnh gốc đủ
// lớn; ảnh gốc 560 px mà bắt CDN phóng lên thì chỉ nhoè thêm
const sceneHdUrl = (url: string) => `${url}?w=1120&h=476&fit=crop&fm=webp&q=90`
// Cảnh có ảnh gốc chỉ 560 px: bản vẽ lại 1120 px (Nano Banana 2.1, cùng bố cục, vạch vỉa hè /
// làn xe giữ nguyên) nằm trong /public, ưu tiên hơn ảnh Studio khi bật "Mặt phố sống động"
const LOCAL_HD = new Set(['saigon', 'hue', 'dalat', 'nhatrang', 'cantho', 'tiengiang'])
const localHd = (id: string) => ({
  morning: `/chill/scenes/hd/${id}-morning.webp`,
  afternoon: `/chill/scenes/hd/${id}-afternoon.webp`,
  night: `/chill/scenes/hd/${id}-night.webp`,
})

function isTimeZone(tz?: string): tz is string {
  if (!tz) return false
  try {
    new Intl.DateTimeFormat('en', {timeZone: tz})
    return true
  } catch {
    return false
  }
}

export async function getChillContent(revalidate: number) {
  const showHidden = process.env.NODE_ENV === 'development' && process.env.CHILL_DEV_HIDDEN === '1'
  const content = await sanityFetch<ChillContent>({query: CHILL_QUERY, params: {showHidden}, revalidate}).catch(
    (): ChillContent => ({tracks: [], destinations: [], updates: []})
  )

  const fromStudio: Track[] = content.tracks.map((t) => ({
    id: t.id,
    title: t.title,
    mood: t.mood ?? '',
    duration: t.duration ?? 0,
    src: t.src,
    station: STATIONS.some((st) => st.id === t.station) ? (t.station as StationId) : undefined,
  }))
  // Sanity lỗi / chưa có bài nào → bộ dự phòng trong code
  const tracks: Track[] = fromStudio.length ? fromStudio : TRACKS

  const fromStudioDest: Destination[] = content.destinations.map((d) => ({
    id: d.id,
    name: d.name,
    region: d.region ?? '',
    timeZone: isTimeZone(d.timeZone) ? d.timeZone : 'Asia/Ho_Chi_Minh',
    tilt: d.tilt,
    laneShift: d.laneShift,
    scenery: d.scenery === 'countryside' || d.scenery === 'railway' ? d.scenery : 'street',
    streets: {morning: sceneUrl(d.morning), afternoon: sceneUrl(d.afternoon), night: sceneUrl(d.night)},
    streetsHd: LOCAL_HD.has(d.id) ? localHd(d.id) : (d.minWidth ?? 0) >= 1120 ? {morning: sceneHdUrl(d.morning), afternoon: sceneHdUrl(d.afternoon), night: sceneHdUrl(d.night)} : undefined,
    signs: d.signs?.length ? d.signs : undefined,
  }))
  const destinations: Destination[] = [...(fromStudioDest.length ? fromStudioDest : DESTINATIONS)]
  // Chỉ máy dev: thêm cảnh đồng miền Tây (ảnh local, đang làm) để thử trước khi đưa lên Studio
  if (process.env.NODE_ENV === 'development' && process.env.CHILL_DEV_MIENTAY === '1') {
    const img = (t: string) => `/chill/scenes/mientay-${t}.webp`
    destinations.push({
      id: 'mientay-dev',
      name: 'Miền Tây (dev)',
      region: 'Việt Nam',
      timeZone: 'Asia/Ho_Chi_Minh',
      scenery: 'countryside',
      streets: {morning: img('morning'), afternoon: img('afternoon'), night: img('night')},
    })
  }
  // Chỉ máy dev: phố đường tàu Hà Nội (ảnh local) để thử trước khi đưa lên Studio
  if (process.env.NODE_ENV === 'development' && process.env.CHILL_DEV_RAILWAY === '1') {
    const img = (t: string) => `/chill/scenes/hanoi-tau-${t}.webp`
    destinations.unshift({
      id: 'railway-dev',
      name: 'Đường tàu (dev)',
      region: 'Việt Nam',
      timeZone: 'Asia/Ho_Chi_Minh',
      scenery: 'railway',
      streets: {morning: img('morning'), afternoon: img('afternoon'), night: img('night')},
    })
  }

  // Ảnh tĩnh: CDN thu về 800px webp · GIF giữ nguyên để còn chuyển động
  const updates: ChillUpdate[] = (content.updates ?? []).map(({image, ...u}) => ({
    ...u,
    image: image?.url
      ? {src: image.mimeType === 'image/gif' ? image.url : `${image.url}?w=800&fm=webp&q=85`, w: image.w ?? 16, h: image.h ?? 9}
      : null,
  }))

  // Kệ sưu tầm: bật ở Studio. Máy dev bật thử được bằng CHILL_DEV_SHELF=1 (không đụng Studio)
  const shelfOn = content.shelfOpen === true || (process.env.NODE_ENV === 'development' && process.env.CHILL_DEV_SHELF === '1')

  const playCountsOn = content.playCountsOpen === true || (process.env.NODE_ENV === 'development' && process.env.CHILL_DEV_PLAYS === '1')
  // Thử thách chung: API tự kiểm tra đủ lựa chọn chưa, trang chỉ cần biết có nên hỏi API
  const questOn = content.questOpen === true || (process.env.NODE_ENV === 'development' && process.env.CHILL_DEV_QUEST === '1')
  // Cần câu lông vũ trêu mèo. Máy dev: CHILL_DEV_CATTOY=1
  const catToyOn = content.catToyOpen === true || (process.env.NODE_ENV === 'development' && process.env.CHILL_DEV_CATTOY === '1')
  // Khách chọn người ngồi nam / nữ. Máy dev: CHILL_DEV_SEAT=1
  const seatPickOn = content.seatPickOpen === true || (process.env.NODE_ENV === 'development' && process.env.CHILL_DEV_SEAT === '1')
  // Người, xe, chó ngoài phố chuyển động mượt (nảy, nan quay, nhún bước). Máy dev: CHILL_DEV_MOTION=1
  const streetMotionOn = content.streetMotionOpen === true || (process.env.NODE_ENV === 'development' && process.env.CHILL_DEV_MOTION === '1')
  // Thu nhỏ quán thành cửa sổ nổi (Document PiP) + Media Session. Máy dev: CHILL_DEV_MINI=1
  const miniPlayerOn = content.miniPlayerOpen === true || (process.env.NODE_ENV === 'development' && process.env.CHILL_DEV_MINI === '1')
  // Mặt phố sống động (ảnh nét, đèn đêm, neon, bóng mây). Máy dev: CHILL_DEV_FACADE=1
  const facadeOn = content.facadeOpen === true || (process.env.NODE_ENV === 'development' && process.env.CHILL_DEV_FACADE === '1')
  // Đà Lạt sương mù (ảnh mới, sương trôi, khói, kính mờ). Máy dev: CHILL_DEV_HIGHLAND=1
  const highlandOn = content.highlandOpen === true || (process.env.NODE_ENV === 'development' && process.env.CHILL_DEV_HIGHLAND === '1')
  return {tracks, destinations, updates, shelfOn, playCountsOn, questOn, catToyOn, seatPickOn, streetMotionOn, miniPlayerOn, facadeOn, highlandOn}
}
