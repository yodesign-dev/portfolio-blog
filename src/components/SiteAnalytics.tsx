'use client'

import {Analytics} from '@vercel/analytics/next'

// Vercel Analytics cho cả site. Gói Hobby chỉ có 50K lượt / tháng chung mọi dự án (custom
// event không được tính ở Hobby), nên bỏ những lượt không phải khách thật:
// - /studio…: Sanity Studio, chỉ Bin vào
// - /chill/embed: khung nhúng trong Notion / blog — mỗi lần ai mở trang có khung là 1 lượt
// - /chill/record: trang quay video YouTube
// - Máy đã mở 1 lần với ?notrack=1 (Bin soi / test trên prod); ?notrack=0 để đếm lại
// beforeSend là hàm nên phải nằm ở client component
const SKIP = ['/studio', '/chill/embed', '/chill/record']
const NOTRACK_KEY = 'site:notrack'

function notTracked() {
  try {
    const flag = new URLSearchParams(window.location.search).get('notrack')
    if (flag === '1') localStorage.setItem(NOTRACK_KEY, '1')
    if (flag === '0') localStorage.removeItem(NOTRACK_KEY)
    return localStorage.getItem(NOTRACK_KEY) === '1'
  } catch {
    // Không đọc được localStorage (chế độ riêng tư…) → cứ đếm như khách thường
    return false
  }
}

export function SiteAnalytics() {
  return (
    <Analytics
      beforeSend={(event) => {
        const path = new URL(event.url).pathname
        if (SKIP.some((p) => path === p || path.startsWith(`${p}/`))) return null
        return notTracked() ? null : event
      }}
    />
  )
}
