import type {Metadata} from 'next'
import {ChillEmbed} from '@/components/chill/ChillEmbed'
import {getChillContent} from '../content'

export const revalidate = 60

// Bản thu nhỏ của /chill để nhúng vào Notion, blog… (khối /embed của Notion).
// Chỉ trang này được phép nằm trong iframe của site khác — xem next.config.ts.
export const metadata: Metadata = {
  title: 'Chill for work · Mini player',
  description: 'A tiny pixel café with lo-fi music to embed in Notion or your own page.',
  robots: {index: false},
}

export default async function ChillEmbedPage() {
  const {tracks, destinations} = await getChillContent(revalidate)
  return <ChillEmbed tracks={tracks} destinations={destinations} />
}
