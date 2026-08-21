'use client'

import {useEffect, useRef} from 'react'

type ViewTrackerProps = {
  postId: string
  // MỚI: cần slug để API route biết đúng path nào cần revalidate
  slug: string
}

export function ViewTracker({postId, slug}: ViewTrackerProps) {
  const hasTracked = useRef(false)

  useEffect(() => {
    if (hasTracked.current) return
    hasTracked.current = true

    fetch('/api/track-view', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({id: postId, slug}),
    }).catch(() => {
      // Im lặng bỏ qua lỗi — tracking thất bại không nên ảnh hưởng
      // trải nghiệm đọc bài của người dùng.
    })
  }, [postId, slug])

  return null
}
