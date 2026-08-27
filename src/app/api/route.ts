import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const { name, email, message } = await request.json();

    if (!name || !email || !message) {
      return NextResponse.json({ error: "Vui lòng điền đầy đủ thông tin" }, { status: 400 });
    }

    await resend.emails.send({
      // Domain onboarding@resend.dev dùng được ngay không cần setup gì
      // thêm — chỉ giới hạn gửi tới đúng email đã đăng ký tài khoản
      // Resend, khớp đúng nhu cầu (gửi về nguyenbinhdesign@gmail.com).
      from: "YoBlogs Contact <onboarding@resend.dev>",
      to: "nguyenbinhdesign@gmail.com",
      replyTo: email,
      subject: `Liên hệ mới từ ${name}`,
      text: `Tên: ${name}\nEmail: ${email}\n\nTin nhắn:\n${message}`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("contact form error:", error);
    return NextResponse.json({ error: "Gửi thất bại, thử lại sau" }, { status: 500 });
  }
}
