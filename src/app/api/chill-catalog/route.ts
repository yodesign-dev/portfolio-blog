import {NextResponse} from "next/server";
import {getChillContent} from "@/app/chill/content";
import {STATIONS} from "@/components/chill/tracks";

// Danh sách nhạc + điểm đến của /chill dạng JSON — cho Chrome extension "Lofi Pixel Cafe"
// (thư mục extension/), vì trang /chill chỉ đọc Sanity phía server (content.ts).
//
// GET → {v, stations, tracks, destinations}. Dữ liệu công khai, chỉ đọc → mở CORS cho mọi
// nguồn (extension gọi từ chrome-extension://…). CDN giữ 5 phút.
// Đường dẫn ảnh / nhạc có thể là tương đối (bộ dự phòng trong code) — extension tự ghép với
// địa chỉ trang.

export const revalidate = 300;

export async function GET() {
  const {tracks, destinations} = await getChillContent(revalidate);
  return NextResponse.json(
    {
      v: 1,
      stations: STATIONS,
      tracks,
      destinations: destinations.map(({id, name, region, timeZone, streets}) => ({id, name, region, timeZone, streets})),
    },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    },
  );
}
