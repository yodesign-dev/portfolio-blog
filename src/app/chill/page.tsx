import {ChillRoom} from '@/components/chill/ChillRoom'
import {GoogleTag} from '@/components/chill/GoogleTag'
import {pageMetadata} from '@/lib/site'
import type {Metadata, Viewport} from 'next'
import {getChillContent} from './content'

export const revalidate = 60

export const metadata: Metadata = {
  ...pageMetadata({
    title: 'Chill for work',
    description: 'A pixel café by a window in Vietnam with lo-fi music you can pick, weather, time of day and destinations. Put it on while you work.',
    path: '/chill',
    // Ảnh cảnh thật (phòng Night desk nhìn ra phố Hà Nội) để người xem nhận ra ngay khi link được chia sẻ
    image: '/chill/og.jpg',
  }),
  // Cài quán thành ứng dụng "Lofi Pixel Cafe" (PWA) — manifest chỉ cho /chill
  manifest: '/chill/manifest.webmanifest',
  appleWebApp: {capable: true, title: 'Lofi Pixel Cafe', statusBarStyle: 'black-translucent'},
  icons: {apple: '/chill/app/apple-touch-icon.png'},
}

export const viewport: Viewport = {themeColor: '#16131a'}

export default async function ChillPage() {
  const {tracks, destinations, updates, shelfOn, playCountsOn, questOn, catToyOn, seatPickOn, streetMotionOn, miniPlayerOn, facadeOn, highlandOn, sleepTimerOn} = await getChillContent(revalidate)
  return (
    <>
      <ChillRoom tracks={tracks} destinations={destinations} updates={updates} shelfOn={shelfOn} playCountsOn={playCountsOn} questOn={questOn} catToyOn={catToyOn} seatPickOn={seatPickOn} streetMotionOn={streetMotionOn} miniPlayerOn={miniPlayerOn} facadeOn={facadeOn} highlandOn={highlandOn} sleepTimerOn={sleepTimerOn} />
      <GoogleTag />
    </>
  )
}
