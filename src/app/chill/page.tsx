import {ChillRoom} from '@/components/chill/ChillRoom'
import {pageMetadata} from '@/lib/site'
import {getChillContent} from './content'

export const revalidate = 60

export const metadata = pageMetadata({
  title: 'Chill for work',
  description: 'A pixel café by a window in Vietnam with lo-fi music you can pick, weather, time of day and destinations. Put it on while you work.',
  path: '/chill',
  // Ảnh cảnh thật (phòng Night desk nhìn ra phố Hà Nội) để người xem nhận ra ngay khi link được chia sẻ
  image: '/chill/og.jpg',
})

export default async function ChillPage() {
  const {tracks, destinations, updates, shelfOn, playCountsOn, questOn} = await getChillContent(revalidate)
  return <ChillRoom tracks={tracks} destinations={destinations} updates={updates} shelfOn={shelfOn} playCountsOn={playCountsOn} questOn={questOn} />
}
