import {NextRequest, NextResponse} from 'next/server'
import {writeClient} from '@/sanity/lib/writeClient'

export async function POST(request: NextRequest) {
  try {
    const {id} = await request.json()

    if (!id || typeof id !== 'string') {
      return NextResponse.json({error: 'Thiếu id bài viết'}, {status: 400})
    }

    // setIfMissing đảm bảo các document cũ (tạo trước khi có field
    // viewCount) không bị lỗi khi patch — coi như đang là 0 trước khi +1.
    await writeClient
      .patch(id)
      .setIfMissing({viewCount: 0})
      .inc({viewCount: 1})
      .commit({autoGenerateArrayKeys: true})

    return NextResponse.json({success: true})
  } catch (error) {
    console.error('track-view error:', error)
    return NextResponse.json({error: 'Không thể cập nhật lượt xem'}, {status: 500})
  }
}
