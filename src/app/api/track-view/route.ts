import { NextRequest, NextResponse } from "next/server";
import { writeClient } from "@/sanity/lib/writeClient";

export async function POST(request: NextRequest) {
  try {
    const { id } = await request.json();

    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "Thiếu id bài viết" }, { status: 400 });
    }

    // MỚI: xác nhận id thực sự thuộc về 1 document loại "post" đã tồn
    // tại, trước khi cho phép ghi — chặn trường hợp ai đó gửi id tuỳ ý
    // (vd: "resume", hoặc id của document khác) để ghi field viewCount
    // vào những nơi không nên có field này.
    const exists = await writeClient.fetch(
      `defined(*[_type == "post" && _id == $id][0]._id)`,
      { id }
    );
    if (!exists) {
      return NextResponse.json({ error: "Không tìm thấy bài viết" }, { status: 404 });
    }

    await writeClient
      .patch(id)
      .setIfMissing({ viewCount: 0 })
      .inc({ viewCount: 1 })
      .commit({ autoGenerateArrayKeys: true });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("track-view error:", error);
    return NextResponse.json({ error: "Không thể cập nhật lượt xem" }, { status: 500 });
  }
}
