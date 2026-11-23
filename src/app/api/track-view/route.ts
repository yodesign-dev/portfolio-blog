import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { writeClient } from "@/sanity/lib/writeClient";
import { overLimit, redis } from "@/lib/chillChat";

// +1 lượt xem cho bài blog (ViewTracker.tsx gọi 1 lần khi mở bài).
//
// Mỗi lượt là 1 mutation Sanity → phải chặn spam, nếu không 1 vòng lặp curl vừa bơm số
// lượt xem vừa đốt hạn mức API của Sanity (blog / portfolio dùng chung project):
// - cùng 1 máy (IP) xem lại cùng bài trong 24 giờ chỉ tính 1 lần (giống lượt nghe /chill)
// - mỗi IP tối đa VIEW_RATE lượt được tính / giờ
// - không có Redis thì KHÔNG đếm (thà hụt vài lượt xem còn hơn mở cửa cho spam)
// Redis dùng chung với /chill; máy dev ghi khoá riêng để không lẫn số thật.

const PREFIX = process.env.NODE_ENV === "development" ? "blog:dev:views" : "blog:views";
const DAY_S = 24 * 60 * 60;
const VIEW_RATE = { count: 30, seconds: 3600 };
// _id của bài đã xuất bản (không nhận "drafts.…" hay chuỗi rác)
const ID_RE = /^[A-Za-z0-9_-][A-Za-z0-9._-]{0,127}$/;

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as { id?: unknown } | null;
    const id = typeof body?.id === "string" ? body.id : "";
    if (!ID_RE.test(id) || id.startsWith("drafts.")) {
      return NextResponse.json({ error: "Thiếu id bài viết" }, { status: 400 });
    }

    const r = redis();
    if (!r) return NextResponse.json({ counted: false });
    const ipHash = hashIp(request);
    if (await overLimit(r, `${PREFIX}:rl:${ipHash}`, VIEW_RATE.count, VIEW_RATE.seconds)) {
      return NextResponse.json({ counted: false });
    }
    // Đã tính cho máy này trong 24h → thôi, không đụng Sanity
    const fresh = await r.set(`${PREFIX}:seen:${ipHash}:${id}`, 1, { nx: true, ex: DAY_S });
    if (fresh !== "OK") return NextResponse.json({ counted: false });

    // Chỉ ghi vào document loại "post" đã tồn tại — id tuỳ ý (vd "resume") không bị
    // gắn thêm field viewCount
    const exists = await writeClient.fetch(`defined(*[_type == "post" && _id == $id][0]._id)`, { id });
    if (!exists) {
      return NextResponse.json({ error: "Không tìm thấy bài viết" }, { status: 404 });
    }

    await writeClient.patch(id).setIfMissing({ viewCount: 0 }).inc({ viewCount: 1 }).commit();
    return NextResponse.json({ counted: true });
  } catch (error) {
    console.error("track-view error:", error);
    return NextResponse.json({ error: "Không thể cập nhật lượt xem" }, { status: 500 });
  }
}

function hashIp(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  return createHash("sha256")
    .update(`views:${ip}:${process.env.TURNSTILE_SECRET_KEY ?? ""}`)
    .digest("hex")
    .slice(0, 24);
}
