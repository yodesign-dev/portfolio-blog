import {createHash} from "node:crypto";
import {NextRequest, NextResponse} from "next/server";
import {client} from "@/sanity/lib/client";
import {overLimit, redis} from "@/lib/chillChat";

// Lượt nghe từng bài của trang /chill.
//
// GET  → {open, counts: {<id bài>: số lượt}} — CDN giữ 5 phút, trang chỉ hiện số từ 50 lượt.
// POST {id} → +1 lượt cho bài vừa phát đủ 30 giây (trang tự đếm, xem ChillRoom.tsx).
//        Cùng 1 máy (IP) nghe lại cùng bài trong 24 giờ chỉ tính 1 lần. Trả {counted}.
//
// Lưu trên Upstash Redis (chung với phòng chat): hash `chill:plays` id → số lượt, khoá
// "đã tính" hết hạn sau 24h. Máy dev ghi vào `chill:dev:plays` để không lẫn số thật.
// Studio → "Chill · Cài đặt" → "Lượt nghe": tắt là ngừng đếm và ẩn số (mặc định tắt).

const PREFIX = process.env.NODE_ENV === "development" ? "chill:dev:plays" : "chill:plays";
const DAY_S = 24 * 60 * 60;
// Một máy nghe liền 1 giờ cũng chỉ hết khoảng 20 bài; dư ra là gọi API cho vui
const POST_RATE = {count: 60, seconds: 3600};

type Settings = {open: boolean; ids: Set<string>};

async function settings(): Promise<Settings> {
  try {
    const s = await client.fetch<{open?: boolean; tracks?: {id?: string | null}[]} | null>(
      `{"open": *[_id == "chillSettings"][0].playCountsOpen,
        "tracks": *[_type == "chillTrack" && hidden != true]{"id": coalesce(key.current, _id)}}`,
      {},
      {next: {revalidate: 30}},
    );
    const ids = (s?.tracks ?? []).map((t) => t.id).filter((id): id is string => !!id);
    // Máy dev bật thử được bằng CHILL_DEV_PLAYS=1 (không đụng Studio)
    const dev = process.env.NODE_ENV === "development" && process.env.CHILL_DEV_PLAYS === "1";
    return {open: s?.open === true || dev, ids: new Set(ids)};
  } catch {
    // Không đọc được công tắc → coi như đang tắt
    return {open: false, ids: new Set()};
  }
}

export async function GET() {
  const cache = {"Cache-Control": "public, s-maxage=300, stale-while-revalidate=600"};
  const {open} = await settings();
  const r = redis();
  if (!open || !r) return NextResponse.json({open: false, counts: {}}, {headers: cache});
  try {
    const raw = (await r.hgetall<Record<string, number | string>>(PREFIX)) ?? {};
    const counts = Object.fromEntries(Object.entries(raw).map(([id, n]) => [id, Number(n) || 0]));
    return NextResponse.json({open: true, counts}, {headers: cache});
  } catch (error) {
    console.error("chill-plays GET error:", error);
    return NextResponse.json({open: true, counts: {}}, {headers: {"Cache-Control": "no-store"}});
  }
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as {id?: unknown} | null;
  const id = typeof body?.id === "string" ? body.id : "";
  const {open, ids} = await settings();
  const r = redis();
  // Tắt / không có Redis / bài lạ → im lặng bỏ qua, nhạc vẫn phát bình thường
  if (!open || !r || !ids.has(id)) return NextResponse.json({counted: false});

  const ipHash = hashIp(request);
  if (await overLimit(r, `${PREFIX}:rl:${ipHash}`, POST_RATE.count, POST_RATE.seconds)) {
    return NextResponse.json({counted: false});
  }
  try {
    const fresh = await r.set(`${PREFIX}:seen:${ipHash}:${id}`, 1, {nx: true, ex: DAY_S});
    if (fresh !== "OK") return NextResponse.json({counted: false});
    await r.hincrby(PREFIX, id, 1);
    return NextResponse.json({counted: true});
  } catch (error) {
    console.error("chill-plays POST error:", error);
    return NextResponse.json({counted: false});
  }
}

function hashIp(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  return createHash("sha256")
    .update(`plays:${ip}:${process.env.TURNSTILE_SECRET_KEY ?? ""}`)
    .digest("hex")
    .slice(0, 24);
}
