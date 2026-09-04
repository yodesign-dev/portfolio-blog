import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// Gọi API xác minh của Cloudflare — bắt buộc phải verify ở SERVER, verify
// ở client chỉ là UI, bot hoàn toàn có thể bỏ qua giao diện và gọi thẳng
// /api/contact nếu server không tự kiểm tra lại token.
async function verifyTurnstile(token: string, ip: string | null): Promise<boolean> {
  const formData = new URLSearchParams();
  formData.append("secret", process.env.TURNSTILE_SECRET_KEY ?? "");
  formData.append("response", token);
  if (ip) formData.append("remoteip", ip);

  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: formData,
  });

  const data = await res.json();
  return data.success === true;
}

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

    const ip = request.headers.get("x-forwarded-for");
    const isHuman = await verifyTurnstile(captchaToken, ip);
    if (!isHuman) {
      return NextResponse.json({ error: "Xác minh captcha thất bại, thử lại nhé" }, { status: 400 });
    }

    await resend.emails.send({
      from: "YoBlogs Contact <onboarding@resend.dev>",
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
