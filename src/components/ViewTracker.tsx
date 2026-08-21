'use client'

import {useEffect, useRef} from 'react'

type ViewTrackerProps = {
  postId: string
}

// Component vô hình — không render UI gì, chỉ gọi API tăng viewCount
// đúng 1 lần khi trình duyệt thật load xong trang. Đặt ở trang chi tiết
// bài viết, KHÔNG đặt ở trang danh sách (tránh đếm nhầm khi lướt qua
// nhiều bài mà chưa thực sự mở đọc).
export function ViewTracker({postId}: ViewTrackerProps) {
  const hasTracked = useRef(false)

  useEffect(() => {
    // useRef guard: React StrictMode (chỉ ở dev) cố tình chạy effect 2 lần
    // để phát hiện side-effect không an toàn — nếu không có guard này,
    // mỗi lần load trang lúc dev sẽ tăng viewCount lên 2 thay vì 1.
    if (hasTracked.current) return
    hasTracked.current = true

    fetch('/api/track-view', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({id: postId}),
    }).catch(() => {
      // Im lặng bỏ qua lỗi — tracking thất bại không nên ảnh hưởng
      // trải nghiệm đọc bài của người dùng.
    })
  }, [postId])

  return null
}
