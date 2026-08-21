import {NextRequest, NextResponse} from 'next/server'
import {revalidatePath} from 'next/cache'
import {writeClient} from '@/sanity/lib/writeClient'

export async function POST(request: NextRequest) {
  try {
    const {id, slug} = await request.json()

    if (!id || typeof id !== 'string') {
      return NextResponse.json({error: 'Thiếu id bài viết'}, {status: 400})
    }

    await writeClient
      .patch(id)
      .setIfMissing({viewCount: 0})
      .inc({viewCount: 1})
      .commit({autoGenerateArrayKeys: true})

    // MỚI: xoá cache ISR của đúng 2 trang liên quan ngay sau khi tăng
    // viewCount — nếu không có bước này, trang chi tiết vẫn hiện số cũ
    // cho tới khi hết chu kỳ revalidate = 60 tự nhiên, gây cảm giác
    // "vào detail thấy 0 nhưng ra listing lại thấy 1" như đã gặp.
    if (typeof slug === 'string' && slug) {
      revalidatePath(`/blog/${slug}`)
    }
    revalidatePath('/blog')

    return NextResponse.json({success: true})
  } catch (error) {
    console.error('track-view error:', error)
    return NextResponse.json({error: 'Không thể cập nhật lượt xem'}, {status: 500})
  }
}
