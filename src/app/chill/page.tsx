import {ChillRoom} from '@/components/chill/ChillRoom'
import {DESTINATIONS, type Destination} from '@/components/chill/destinations'
import {TRACKS, type Track} from '@/components/chill/tracks'
import {sanityFetch} from '@/sanity/lib/fetch'
import {pageMetadata} from '@/lib/site'

export const revalidate = 60

export const metadata = pageMetadata({
  title: 'Chill for work',
  description: 'A pixel café by a window in Vietnam with lo-fi music you can pick, weather, time of day and destinations. Put it on while you work.',
  path: '/chill',
})

// Nhạc + điểm đến thêm trong Sanity Studio, nối vào sau bộ có sẵn trong code.
// Chỉ lấy bản đã đủ file/ảnh để trang không bị bài câm hay cảnh trống.
const CHILL_QUERY = `{
  "tracks": *[_type == "chillTrack" && defined(audio.asset)] | order(coalesce(order, 9999) asc, _createdAt asc) {
    _id,
    title,
    mood,
    duration,
    "src": audio.asset->url
  },
  "destinations": *[_type == "chillDestination" && defined(slug.current)
    && defined(morning.asset) && defined(afternoon.asset) && defined(night.asset)]
    | order(coalesce(order, 9999) asc, _createdAt asc) {
    "id": slug.current,
    name,
    region,
    timeZone,
    tilt,
    laneShift,
    "morning": morning.asset->url,
    "afternoon": afternoon.asset->url,
    "night": night.asset->url
  }
}`

type ChillContent = {
  tracks: {_id: string; title: string; mood?: string; duration?: number; src: string}[]
  destinations: {
    id: string
    name: string
    region?: string
    timeZone?: string
    tilt?: number
    laneShift?: number
    morning: string
    afternoon: string
    night: string
  }[]
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
    (): ChillContent => ({tracks: [], destinations: []})
  )

  const tracks: Track[] = [
    ...TRACKS,
    ...content.tracks.map((t) => ({
      id: t._id,
      title: t.title,
      mood: t.mood ?? '',
      duration: t.duration ?? 0,
      src: t.src,
    })),
  ]

  const taken = new Set(DESTINATIONS.map((d) => d.id))
  const destinations: Destination[] = [
    ...DESTINATIONS,
    ...content.destinations
      .filter((d) => !taken.has(d.id))
      .map((d) => ({
        id: d.id,
        name: d.name,
        region: d.region ?? '',
        timeZone: isTimeZone(d.timeZone) ? d.timeZone : 'Asia/Ho_Chi_Minh',
        tilt: d.tilt,
        laneShift: d.laneShift,
        streets: {morning: sceneUrl(d.morning), afternoon: sceneUrl(d.afternoon), night: sceneUrl(d.night)},
      })),
  ]

  return <ChillRoom tracks={tracks} destinations={destinations} />
}
