import type {Metadata} from 'next'
import {ChillRecord} from '@/components/chill/ChillRecord'
import {getChillContent} from '../content'

export const revalidate = 60

// Trang quay video cho YouTube / Shorts: chỉ có cảnh, không nút. Tham số xem ChillRecord.tsx.
export const metadata: Metadata = {
  title: 'Chill for work · Record',
  robots: {index: false},
}

export default async function ChillRecordPage() {
  const {destinations, streetMotionOn, facadeOn, highlandOn} = await getChillContent(revalidate)
  return <ChillRecord destinations={destinations} streetMotionOn={streetMotionOn} facadeOn={facadeOn} highlandOn={highlandOn} />
}
