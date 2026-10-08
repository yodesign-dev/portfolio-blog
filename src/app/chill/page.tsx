import {ChillRoom} from '@/components/chill/ChillRoom'
import {DESTINATIONS, type Destination} from '@/components/chill/destinations'
import {STATIONS, TRACKS, type StationId, type Track} from '@/components/chill/tracks'
import {sanityFetch} from '@/sanity/lib/fetch'
import {pageMetadata} from '@/lib/site'
import type {ChillUpdate} from '@/components/chill/Changelog'

export const revalidate = 60

export const metadata = pageMetadata({
  title: 'Chill for work',
  description: 'A pixel café by a window in Vietnam with lo-fi music you can pick, weather, time of day and destinations. Put it on while you work.',
  path: '/chill',
  // Ảnh cảnh thật (phòng Night desk nhìn ra phố Hà Nội) để người xem nhận ra ngay khi link được chia sẻ
  image: '/chill/og.jpg',
})

// Nhạc + điểm đến quản lý trong Sanity Studio. Code (tracks.ts / destinations.ts)
// chỉ còn vài bài + Hà Nội dự phòng, dùng khi Sanity không trả về gì.
// Chỉ lấy bản đã đủ file/ảnh và không bị "Ẩn khỏi trang".
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
  "destinations": *[_type == "chillDestination" && hidden != true && defined(slug.current)
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
    "night": night.asset->url
  },
  "updates": *[_type == "chillUpdate" && defined(title) && defined(date) && count(items) > 0]
    | order(date desc, _createdAt desc)[0...12] {
    "id": _id,
    title,
    date,
    kind,
    version,
    announce,
    action,
    actionLabel,
    "items": items[defined(text)]{icon, text},
    "image": image.asset->{url, mimeType, "w": metadata.dimensions.width, "h": metadata.dimensions.height},
    "imageAlt": image.alt
  }
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
  }[]
  updates: (Omit<ChillUpdate, 'image'> & {image?: {url: string; mimeType?: string; w?: number; h?: number} | null})[]
}

// Sanity CDN tự cắt/thu nhỏ ảnh về đúng khung phố của canvas (560×238)
const sceneUrl = (url: string) => `${url}?w=560&h=238&fit=crop&fm=webp&q=90`

function isTimeZone(tz?: string): tz is string {
  if (!tz) return false
  try {
    new Intl.DateTimeFormat('en', {timeZone: tz})
    return true
  } catch {
    return false
  }
}

export default async function ChillPage() {
  const content = await sanityFetch<ChillContent>({query: CHILL_QUERY, revalidate}).catch(
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
    scenery: d.scenery === 'countryside' ? 'countryside' : 'street',
    streets: {morning: sceneUrl(d.morning), afternoon: sceneUrl(d.afternoon), night: sceneUrl(d.night)},
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

  // Ảnh tĩnh: CDN thu về 800px webp · GIF giữ nguyên để còn chuyển động
  const updates: ChillUpdate[] = (content.updates ?? []).map(({image, ...u}) => ({
    ...u,
    image: image?.url
      ? {src: image.mimeType === 'image/gif' ? image.url : `${image.url}?w=800&fm=webp&q=85`, w: image.w ?? 16, h: image.h ?? 9}
      : null,
  }))

  return <ChillRoom tracks={tracks} destinations={destinations} updates={updates} />
}
