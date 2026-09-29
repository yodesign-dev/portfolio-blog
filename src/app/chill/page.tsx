import {ChillRoom} from '@/components/chill/ChillRoom'
import {pageMetadata} from '@/lib/site'

export const metadata = pageMetadata({
  title: 'Chill for work',
  description: 'A pixel café by a window in Hanoi with lo-fi music you can pick, weather and time of day. Put it on while you work.',
  path: '/chill',
})

export default function ChillPage() {
  return <ChillRoom />
}
