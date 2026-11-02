import {NextResponse} from "next/server";
import {getChillContent} from "@/app/chill/content";

// Lịch mùa của /chill cho tab đang mở nhiều ngày: gọi 30 phút một lần để nút tắt khẩn cấp trong
// Studio có tác dụng cả với khách không tải lại trang. Giờ bật / tắt máy khách tự so.

export const revalidate = 60;

export async function GET() {
  const {seasons} = await getChillContent(revalidate);
  return NextResponse.json({seasons}, {headers: {"Cache-Control": "public, s-maxage=60, stale-while-revalidate=300"}});
}
