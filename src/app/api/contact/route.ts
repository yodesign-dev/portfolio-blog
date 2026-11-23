import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { verifyTurnstile } from "@/lib/guard";

// Turnstile phải verify ở SERVER (src/lib/guard.ts) — verify ở client chỉ là UI, bot có
// thể bỏ qua giao diện và gọi thẳng /api/contact.

export async function POST(request: NextRequest) {
  try {
    const { name, email, subject, message, captchaToken, company } = await request.json();

    // MỚI: honeypot — nếu field ẩn bị điền, gần như chắc chắn là bot.
    // Trả về "success" giả (không báo lỗi) để bot không biết mình vừa
    // bị chặn và không thử né tránh lần sau — nhưng KHÔNG gửi email thật.
    if (company) {
      return NextResponse.json({ success: true });
    }

    if (!name || !email || !subject || !message) {
      return NextResponse.json({ error: "Vui lòng điền đầy đủ thông tin" }, { status: 400 });
    }

    // MỚI: bắt buộc phải có captcha token và verify thành công mới cho
    // gửi email — chặn cả bot gọi thẳng API bỏ qua giao diện.
    if (!captchaToken) {
      return NextResponse.json({ error: "Vui lòng xác minh captcha" }, { status: 400 });
    }

    const isHuman = await verifyTurnstile(captchaToken, request);
    if (!isHuman) {
      return NextResponse.json({ error: "Xác minh captcha thất bại, thử lại nhé" }, { status: 400 });
    }

    // Khởi tạo Resend trong handler (không ở top-level) — nếu thiếu
    // RESEND_API_KEY lúc build thì module vẫn load được, chỉ request lỗi 500.
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: "Bin Nguyen Contact <onboarding@resend.dev>",
      to: "nguyenbinhdesign@gmail.com",
      replyTo: email,
      subject: `[Get in Touch] ${subject}`,
      text: `Tên: ${name}\nEmail: ${email}\nTiêu đề: ${subject}\n\nTin nhắn:\n${message}`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("contact form error:", error);
    return NextResponse.json({ error: "Gửi thất bại, thử lại sau" }, { status: 500 });
  }
}
