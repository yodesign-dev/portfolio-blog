import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const { name, email, subject, message } = await request.json();

    if (!name || !email || !subject || !message) {
      return NextResponse.json({ error: "Vui lòng điền đầy đủ thông tin" }, { status: 400 });
    }

    await resend.emails.send({
      from: "YoBlogs Contact <onboarding@resend.dev>",
      to: "nguyenbinhdesign@gmail.com",
      replyTo: email,
      // ⬇️ CẬP NHẬT: dùng subject người dùng nhập làm tiêu đề email,
      // thay vì cố định "Liên hệ mới từ {name}" như trước
      subject: `[Get in Touch] ${subject}`,
      text: `Tên: ${name}\nEmail: ${email}\nTiêu đề: ${subject}\n\nTin nhắn:\n${message}`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("contact form error:", error);
    return NextResponse.json({ error: "Gửi thất bại, thử lại sau" }, { status: 500 });
  }
}
