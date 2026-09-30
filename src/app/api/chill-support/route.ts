import {createHash, randomInt, randomUUID} from "node:crypto";
import {after, NextRequest, NextResponse} from "next/server";
import {Resend} from "resend";
import {writeClient} from "@/sanity/lib/writeClient";
import {drinkFor} from "@/components/chill/donate-config";

// Người ủng hộ ở mục "Buy Bin a coffee" trang /chill (Studio: "Chill · Supporters").
//
// GET → lọ tip + bảng cảm ơn trong cảnh: số ly đã nhận (Bin tick "Đã nhận tiền")
//   và danh sách người đồng ý hiện tên. Chỉ trả tên, lời nhắn, đồ uống, ngày —
//   không bao giờ trả số tiền, mã đối chiếu, ipHash.
// POST {action: "intent", name, message, amount, method, context}
//   Bước 1 — người xem để lại tên / lời nhắn TRƯỚC khi chuyển → tạo bản ghi
//   "Chờ đối chiếu" + mã riêng (vd. K7Q2) để gắn vào nội dung chuyển khoản.
//   Người chuyển xong rồi đóng trang luôn thì Bin vẫn có bản ghi để khớp sao kê.
// POST {action: "sent", id?, method, amount, name, note, context}
//   Bấm "I've sent it" → "Đã báo chuyển" + mail báo Bin. Không có id (người bỏ qua
//   bước 1) thì tạo bản ghi mới.
// POST {action: "update", id, name, message, board}
//   Người bỏ qua bước 1 bổ sung tên / lời nhắn ở màn cảm ơn.
//
// ID dạng `chillSupporter.<uuid>` → dataset public không đọc được khi không có token.
// Trang không biết tiền có về thật hay không: Bin đối chiếu rồi tick "Đã nhận tiền".

const ID_RE = /^chillSupporter\.[0-9a-f-]{36}$/;
// Mã đối chiếu: bỏ các ký tự dễ nhầm (0/O, 1/I/L)
const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
// Mỗi IP tối đa 6 bản ghi mới / 10 phút
const RATE = {count: 6, minutes: 10};
// "update" chỉ nhận trong 2 giờ sau khi tạo
const UPDATE_WINDOW_MS = 2 * 60 * 60 * 1000;

type Body = Record<string, unknown>;

const clean = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");
const money = (v: unknown) => Math.max(0, Math.min(100_000_000, Math.round(Number(v) || 0)));
const hasLink = (s: string) => /https?:\/\/|www\./i.test(s);

const BOARD_QUERY = `{
  "cups": count(*[_type == "chillSupporter" && received == true]),
  "supporters": *[_type == "chillSupporter" && received == true && showOnBoard == true
    && (defined(name) || defined(message))] | order(coalesce(sentAt, _createdAt) desc)[0...60] {
    "id": _id, name, message, amount, "at": coalesce(sentAt, _createdAt)
  }
}`;

type BoardRow = {id: string; name?: string; message?: string; amount?: number; at: string};

export async function GET() {
  try {
    const {cups, supporters} = await writeClient.fetch<{cups: number; supporters: BoardRow[]}>(BOARD_QUERY);
    return NextResponse.json(
      {
        cups,
        supporters: supporters.map(({id, name, message, amount, at}) => ({
          // ID gốc là khoá bí mật cho "update" → chỉ gửi bản băm để làm key
          id: createHash("sha256").update(id).digest("hex").slice(0, 12),
          name: name ?? "",
          message: message ?? "",
          drink: drinkFor(amount),
          at,
        })),
      },
      // CDN giữ 30s, hết hạn thì trả bản cũ trong lúc lấy bản mới
      {headers: {"Cache-Control": "public, s-maxage=30, stale-while-revalidate=300"}},
    );
  } catch (error) {
    console.error("chill-support board error:", error);
    return NextResponse.json({cups: 0, supporters: []}, {status: 500});
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Body;
    // Honeypot: field ẩn bị điền → bot. Trả "thành công" giả, không ghi gì.
    if (body.company) return NextResponse.json({success: true});
    if (body.action === "intent") return intent(request, body);
    if (body.action === "sent") return sent(request, body);
    if (body.action === "update") return update(body);
    return NextResponse.json({error: "Unknown action"}, {status: 400});
  } catch (error) {
    console.error("chill-support error:", error);
    return NextResponse.json({error: "Couldn't send, please try again."}, {status: 500});
  }
}

async function intent(request: NextRequest, body: Body) {
  const name = clean(body.name, 40);
  const message = clean(body.message, 300);
  if (hasLink(`${name} ${message}`)) return NextResponse.json({error: "Please leave out links."}, {status: 400});
  const ipHash = hashIp(request);
  if (await limited(ipHash)) return NextResponse.json({error: "Got it already — thank you so much ☕"}, {status: 429});

  const code = Array.from({length: 4}, () => CODE_CHARS[randomInt(CODE_CHARS.length)]).join("");
  const id = `chillSupporter.${randomUUID()}`;
  await writeClient.create({
    _id: id,
    _type: "chillSupporter",
    received: false,
    status: "pending",
    code,
    name: name || undefined,
    message: message || undefined,
    amount: money(body.amount) || undefined,
    method: body.method === "momo" ? "momo" : "vcb",
    showOnBoard: body.board === true,
    context: clean(body.context, 200) || undefined,
    ipHash,
  });
  return NextResponse.json({id, code});
}

async function sent(request: NextRequest, body: Body) {
  const name = clean(body.name, 40);
  const note = clean(body.note, 40);
  const method = body.method === "momo" ? "momo" : "vcb";
  const amount = money(body.amount);
  const now = new Date().toISOString();
  let id = typeof body.id === "string" && ID_RE.test(body.id) ? body.id : "";
  let doc: {name?: string; message?: string; code?: string; amount?: number} | null = null;

  if (id) {
    doc = await writeClient.fetch(`*[_id == $id][0]{name, message, code, amount}`, {id});
    if (!doc) id = "";
  }
  if (id) {
    await writeClient
      .patch(id)
      .set({
        status: "sent",
        sentAt: now,
        method,
        ...(amount ? {amount} : {}),
        ...(note ? {note} : {}),
        ...(typeof body.board === "boolean" ? {showOnBoard: body.board} : {}),
      })
      .commit();
  } else {
    // Bỏ qua bước 1 → bản ghi mới, chưa có tên
    const ipHash = hashIp(request);
    if (await limited(ipHash)) return NextResponse.json({error: "Got it already — thank you so much ☕"}, {status: 429});
    id = `chillSupporter.${randomUUID()}`;
    await writeClient.create({
      _id: id,
      _type: "chillSupporter",
      received: false,
      status: "sent",
      sentAt: now,
      method,
      name: name || undefined,
      note: note || undefined,
      amount: amount || undefined,
      showOnBoard: body.board === true,
      context: clean(body.context, 200) || undefined,
      ipHash,
    });
    doc = {name: name || undefined};
  }

  const who = doc?.name || name;
  const vnd = amount || doc?.amount || 0;
  after(() =>
    notify(
      `[Chill ☕] ${who || "Someone"} bought you a coffee${vnd ? ` · ${vnd.toLocaleString("vi-VN")}đ` : ""}`,
      [
        `Tên: ${who || "Khách"}`,
        `Số tiền (tự khai): ${vnd ? `${vnd.toLocaleString("vi-VN")}đ` : "—"}`,
        `Chuyển qua: ${method === "momo" ? "MoMo" : "Vietcombank"}`,
        `Mã đối chiếu: ${doc?.code ?? "—"}`,
        `Nội dung CK: ${note || "—"}`,
        "",
        doc?.message || "(không có lời nhắn)",
      ],
    ),
  );
  return NextResponse.json({id});
}

async function update(body: Body) {
  const id = typeof body.id === "string" && ID_RE.test(body.id) ? body.id : "";
  const name = clean(body.name, 40);
  const message = clean(body.message, 300);
  if (!id || (!name && !message)) return NextResponse.json({error: "Nothing to add."}, {status: 400});
  if (hasLink(`${name} ${message}`)) return NextResponse.json({error: "Please leave out links."}, {status: 400});
  const doc = await writeClient.fetch<{_createdAt: string} | null>(`*[_id == $id][0]{_createdAt}`, {id});
  if (!doc || Date.now() - new Date(doc._createdAt).getTime() > UPDATE_WINDOW_MS) {
    return NextResponse.json({error: "Not found"}, {status: 404});
  }
  await writeClient
    .patch(id)
    .set({...(name ? {name} : {}), ...(message ? {message} : {}), ...(typeof body.board === "boolean" ? {showOnBoard: body.board} : {})})
    .commit();
  after(() => notify(`[Chill ☕] ${name || "A supporter"} left you a note`, [`Tên: ${name || "Khách"}`, "", message || "(không có lời nhắn)"]));
  return NextResponse.json({success: true});
}

function hashIp(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  return createHash("sha256")
    .update(`${ip}:${process.env.TURNSTILE_SECRET_KEY ?? ""}`)
    .digest("hex")
    .slice(0, 24);
}

async function limited(ipHash: string) {
  const since = new Date(Date.now() - RATE.minutes * 60_000).toISOString();
  const recent = await writeClient.fetch<number>(
    `count(*[_type == "chillSupporter" && ipHash == $ipHash && _createdAt > $since])`,
    {ipHash, since},
  );
  return recent >= RATE.count;
}

async function notify(subject: string, lines: string[]) {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: "Bin Nguyen Contact <onboarding@resend.dev>",
      to: "nguyenbinhdesign@gmail.com",
      subject,
      text: [...lines, "", "Đối chiếu trong app rồi tick “Đã nhận tiền”: Studio → Chill · Supporters — https://applebin.me/studio"].join("\n"),
    });
  } catch (error) {
    console.error("chill-support notify error:", error);
  }
}
