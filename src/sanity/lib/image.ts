import { createImageUrlBuilder, type SanityImageSource } from '@sanity/image-url'

import { dataset, projectId } from '../env'

// https://www.sanity.io/docs/image-url
const builder = createImageUrlBuilder({ projectId, dataset })

export const urlFor = (source: SanityImageSource) => {
  return builder.image(source)
}

// Asset ref của Sanity có dạng "image-<hash>-<width>x<height>-<ext>" — đọc
// kích thước gốc từ đó để next/image giữ đúng tỉ lệ khung ngay từ đầu (không
// nhảy layout khi ảnh lazy-load xong). Trả về null nếu ref không đúng dạng.
export function getImageDimensions(source: {asset?: {_ref?: string}} | undefined) {
  const match = source?.asset?._ref?.match(/-(\d+)x(\d+)-[a-z0-9]+$/i)
  if (!match) return null
  return {width: Number(match[1]), height: Number(match[2])}
}
