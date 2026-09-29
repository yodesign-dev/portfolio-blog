'use client'

import {useEffect, useRef, useState} from 'react'

// Favicon lấy qua Google S2 (redirect sang *.gstatic.com — cả 2 domain phải
// có trong img-src của CSP ở next.config.ts). Nếu ảnh vẫn lỗi (domain không
// có favicon, mạng chặn...) thì hiện chữ cái đầu thay vì icon ảnh vỡ.
function getFaviconUrl(url: string): string | null {
  try {
    const {hostname} = new URL(url)
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`
  } catch {
    return null
  }
}

type ToolIconProps = {
  name: string
  url: string
  size: number
}

export function ToolIcon({name, url, size}: ToolIconProps) {
  const [failed, setFailed] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)
  const favicon = getFaviconUrl(url)

  // Ảnh render từ server có thể lỗi TRƯỚC khi React hydrate xong — lúc đó
  // onError không bắt được, nên kiểm tra lại 1 lần sau khi mount.
  useEffect(() => {
    const img = imgRef.current
    if (img?.complete && img.naturalWidth === 0) setFailed(true)
  }, [])

  if (!favicon || failed) {
    return (
      <span
        aria-hidden="true"
        style={{width: size, height: size}}
        className="flex items-center justify-center rounded bg-neutral-200 text-xs font-semibold uppercase text-neutral-600"
      >
        {name.trim().charAt(0)}
      </span>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={imgRef}
      src={favicon}
      alt=""
      width={size}
      height={size}
      style={{width: size, height: size}}
      onError={() => setFailed(true)}
    />
  )
}
