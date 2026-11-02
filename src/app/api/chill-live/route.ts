import {NextResponse} from "next/server";
import {getChillContent} from "@/app/chill/content";

// Lịch live của /chill cho tab đang mở lâu: gọi 10 phút một lần để khách thấy buổi live mới tạo
// và nút tắt trong Studio có tác dụng cả khi không tải lại trang. Giờ bật / tắt máy khách tự so.

export const revalidate = 60;

export async function GET() {
  const {lives} = await getChillContent(revalidate);
  return NextResponse.json({lives}, {headers: {"Cache-Control": "public, s-maxage=60, stale-while-revalidate=300"}});
}
