import {createHash, randomUUID} from "node:crypto";
import {after, NextRequest, NextResponse} from "next/server";
import {Resend} from "resend";
import {writeClient} from "@/sanity/lib/writeClient";

// Lời nhắn của người vừa bấm "I've sent it" ở mục "Buy Bin a coffee" trang /chill.
// Người xem tự khai (tên, số tiền, lời nhắn — đều không bắt buộc) → lưu vào Studio
// ("Chill · Supporters") + mail báo Bin. Trang không biết tiền có về thật hay
// không: Bin đối chiếu với app ngân hàng / MoMo.
//
// ID dạng `chillSupporter.<uuid>` → dataset public không đọc được khi không có token.

// Mỗi IP tối đa 3 lời nhắn / 10 phút
const RATE = {count: 3, minutes: 10};

export async function POST(request: NextRequest) {
  try {
    const {name, amount, method, note, message, context, company} = await request.json();

    // Honeypot: field ẩn bị điền → bot. Trả "thành công" giả, không ghi gì.
    if (company) return NextResponse.json({success: true});

    const clean = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");
    const who = clean(name, 40);
    const msg = clean(message, 300);
    const vnd = Math.max(0, Math.min(100_000_000, Math.round(Number(amount) || 0)));
    if (/https?:\/\/|www\./i.test(`${who} ${msg}`)) {
      return NextResponse.json({error: "Please leave out links."}, {status: 400});
    }

    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const ipHash = createHash("sha256")
      .update(`${ip}:${process.env.TURNSTILE_SECRET_KEY ?? ""}`)
      .digest("hex")
      .slice(0, 24);
    const since = new Date(Date.now() - RATE.minutes * 60_000).toISOString();
    const recent = await writeClient.fetch<number>(
      `count(*[_type == "chillSupporter" && ipHash == $ipHash && _createdAt > $since])`,
      {ipHash, since},
    );
    if (recent >= RATE.count) {
      return NextResponse.json({error: "Got it already — thank you so much ☕"}, {status: 429});
    }

    const doc = {
      _id: `chillSupporter.${randomUUID()}`,
      _type: "chillSupporter",
      received: false,
      name: who || undefined,
      amount: vnd || undefined,
      method: method === "momo" ? "momo" : "vcb",
      note: clean(note, 40) || undefined,
      message: msg || undefined,
      context: clean(context, 200) || undefined,
      ipHash,
    };
    await writeClient.create(doc);

    after(async () => {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: "Bin Nguyen Contact <onboarding@resend.dev>",
          to: "nguyenbinhdesign@gmail.com",
          subject: `[Chill ☕] ${who || "Someone"} bought you a coffee${vnd ? ` · ${vnd.toLocaleString("vi-VN")}đ` : ""}`,
          text: [
            `Tên: ${who || "Khách"}`,
            `Số tiền (tự khai): ${vnd ? `${vnd.toLocaleString("vi-VN")}đ` : "—"}`,
            `Chuyển qua: ${doc.method === "momo" ? "MoMo" : "Vietcombank"}`,
            `Nội dung CK: ${doc.note ?? "—"}`,
            "",
            msg || "(không có lời nhắn)",
            "",
            "Đối chiếu trong app rồi tick “Đã nhận tiền”: Studio → Chill · Supporters — https://applebin.me/studio",
          ].join("\n"),
        });
      } catch (error) {
        console.error("chill-support notify error:", error);
      }
    });

    return NextResponse.json({success: true});
  } catch (error) {
    console.error("chill-support error:", error);
    return NextResponse.json({error: "Couldn't send, please try again."}, {status: 500});
  }
}
