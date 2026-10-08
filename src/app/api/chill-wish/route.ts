import {createHash, randomUUID} from "node:crypto";
import {after, NextRequest, NextResponse} from "next/server";
import {Resend} from "resend";
import {writeClient} from "@/sanity/lib/writeClient";
import {overLimit, redis} from "@/lib/chillChat";

// Wishlist của trang /chill.
// GET  → danh sách góp ý đã duyệt (không bao giờ trả email / ipHash).
// GET ?mine=id,id → chỉ trạng thái các góp ý người xem từng gửi (máy họ còn lưu
//        bản "Awaiting review"), để bỏ bản đó khi góp ý đã bị ẩn hoặc xoá.
// POST → {action: "submit", ...} gửi góp ý mới (chờ duyệt) · {action: "heart", id, on} thả/bỏ ❤️.
//
// Document có ID dạng `chillWish.<uuid>` — dấu chấm khiến dataset public
// không cho đọc khi không có token, nên phải đọc/ghi bằng writeClient ở đây.

const PUBLIC = ["considering", "planned", "shipped"];
const CATEGORIES = ["feature", "music", "place", "bug", "other"];
const ID_RE = /^chillWish\.[0-9a-f-]{36}$/;
// Mỗi IP tối đa 3 góp ý / 10 phút
const RATE = {count: 3, minutes: 10};
// Thả/bỏ ❤️: mỗi IP tối đa 30 lần / 10 phút; mỗi IP chỉ tính 1 tim cho mỗi góp ý
const HEART_RATE = {count: 30, seconds: 600};
const HEART_TTL_S = 365 * 24 * 60 * 60;

type Wish = {
  id: string;
  text: string;
  category: string;
  name: string;
  createdAt: string;
  hearts: number;
  status: string;
  reply?: string;
};

const LIST_QUERY = `*[_type == "chillWish" && status in $statuses] | order(_createdAt desc)[0...200] {
  "id": _id, text, "category": coalesce(category, "feature"), "name": coalesce(name, ""),
  "createdAt": _createdAt, "hearts": coalesce(hearts, 0), status, reply
}`;

export async function GET(request: NextRequest) {
  const mine = request.nextUrl.searchParams.get("mine");
  if (mine !== null) return mineStatuses(mine);
  try {
    const wishes = await writeClient.fetch<Wish[]>(LIST_QUERY, {statuses: PUBLIC});
    after(notifyShipped);
    return NextResponse.json(
      {wishes},
      // CDN giữ 15s, hết hạn thì trả bản cũ trong lúc lấy bản mới → ít gọi Sanity
      {headers: {"Cache-Control": "public, s-maxage=15, stale-while-revalidate=60"}},
    );
  } catch (error) {
    console.error("chill-wish list error:", error);
    return NextResponse.json({wishes: []}, {status: 500});
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (body?.action === "heart") return heart(request, body);
    if (body?.action === "submit") return submit(request, body);
    return NextResponse.json({error: "Unknown action"}, {status: 400});
  } catch (error) {
    console.error("chill-wish error:", error);
    return NextResponse.json({error: "Something went wrong, please try again."}, {status: 500});
  }
}

async function mineStatuses(param: string) {
  const ids = param.split(",").filter((id) => ID_RE.test(id)).slice(0, 20);
  if (!ids.length) return NextResponse.json({statuses: {}});
  try {
    const found = await writeClient.fetch<{_id: string; status: string}[]>(`*[_id in $ids]{_id, status}`, {ids});
    // Không có trong kết quả = đã bị xoá
    const statuses = Object.fromEntries(ids.map((id) => [id, found.find((f) => f._id === id)?.status ?? "deleted"]));
    return NextResponse.json({statuses}, {headers: {"Cache-Control": "private, no-store"}});
  } catch (error) {
    console.error("chill-wish mine error:", error);
    return NextResponse.json({statuses: {}}, {status: 500});
  }
}

async function heart(request: NextRequest, {id, on}: {id?: unknown; on?: unknown}) {
  if (typeof id !== "string" || !ID_RE.test(id)) {
    return NextResponse.json({error: "Invalid id"}, {status: 400});
  }
  const r = redis();
  const ip = hashIp(request);
  if (await overLimit(r, `chill:wish:rl:heart:${ip}`, HEART_RATE.count, HEART_RATE.seconds)) {
    return NextResponse.json({error: "Slow down a little ☕"}, {status: 429});
  }
  // Chỉ cho thả ❤️ vào góp ý đang hiện công khai
  const current = await writeClient.fetch<{hearts: number} | null>(
    `*[_id == $id && status in $statuses][0]{"hearts": coalesce(hearts, 0)}`,
    {id, statuses: PUBLIC},
  );
  if (!current) return NextResponse.json({error: "Not found"}, {status: 404});
  const delta = on === false ? -1 : 1;
  if (delta < 0 && current.hearts <= 0) return NextResponse.json({hearts: 0});
  // Cùng 1 IP thả tim lần nữa (hoặc bỏ tim chưa từng thả) → không đổi số
  if (r) {
    const key = `chill:wish:hearts:${id}`;
    const changed = await (delta > 0 ? r.sadd(key, ip) : r.srem(key, ip))
      .then(async (n) => (await r.expire(key, HEART_TTL_S), n))
      .catch(() => 1);
    if (!changed) return NextResponse.json({hearts: current.hearts});
  }
  const doc = await writeClient.patch(id).setIfMissing({hearts: 0}).inc({hearts: delta}).commit<{hearts: number}>();
  return NextResponse.json({hearts: doc.hearts});
}

async function submit(
  request: NextRequest,
  {text, category, name, email, context, captchaToken, company}: Record<string, unknown>,
) {
  // Honeypot: field ẩn bị điền → bot. Trả "thành công" giả, không ghi gì.
  if (company) return NextResponse.json({success: true, id: null});

  const clean = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");
  const wish = clean(text, 300);
  const who = clean(name, 30);
  const mail = clean(email, 120);
  if (wish.length < 5) return NextResponse.json({error: "Tell us a bit more (at least 5 characters)."}, {status: 400});
  if (/https?:\/\/|www\.|\.(com|net|io|xyz|ru)\b/i.test(wish)) {
    return NextResponse.json({error: "Please leave out links."}, {status: 400});
  }
  if (mail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) {
    return NextResponse.json({error: "That email doesn't look right."}, {status: 400});
  }
  if (typeof captchaToken !== "string" || !captchaToken) {
    return NextResponse.json({error: "Please complete the captcha."}, {status: 400});
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  if (!(await verifyTurnstile(captchaToken, ip))) {
    return NextResponse.json({error: "Captcha check failed, please try again."}, {status: 400});
  }

  const ipHash = hashIp(request);
  const since = new Date(Date.now() - RATE.minutes * 60_000).toISOString();
  const recent = await writeClient.fetch<number>(
    `count(*[_type == "chillWish" && ipHash == $ipHash && _createdAt > $since])`,
    {ipHash, since},
  );
  if (recent >= RATE.count) {
    return NextResponse.json({error: "You've sent a few already — take a sip and try again in a bit ☕"}, {status: 429});
  }

  const id = `chillWish.${randomUUID()}`;
  const doc = {
    _id: id,
    _type: "chillWish",
    status: "pending",
    text: wish,
    category: CATEGORIES.includes(category as string) ? (category as string) : "feature",
    name: who || undefined,
    email: mail || undefined,
    context: clean(context, 200) || undefined,
    hearts: 0,
    ipHash,
  };
  await writeClient.create(doc);

  // Mail báo Bin có góp ý mới — không bắt người gửi chờ
  after(async () => {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: "Bin Nguyen Contact <onboarding@resend.dev>",
        to: "nguyenbinhdesign@gmail.com",
        replyTo: doc.email,
        subject: `[Chill wishlist] ${wish.slice(0, 60)}`,
        text: [
          `Loại: ${doc.category}`,
          `Người gửi: ${who || "Khách"}${mail ? ` <${mail}>` : ""}`,
          `Bối cảnh: ${doc.context ?? "—"}`,
          "",
          wish,
          "",
          "Duyệt trong Studio → Chill · Wishlist → ⏳ Chờ duyệt: https://applebin.me/studio",
        ].join("\n"),
      });
    } catch (error) {
      console.error("chill-wish notify error:", error);
    }
  });

  return NextResponse.json({success: true, id});
}

// Cùng công thức băm với bản ghi cũ (ipHash trong Sanity) để giới hạn vẫn khớp
function hashIp(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  return createHash("sha256")
    .update(`${ip}:${process.env.TURNSTILE_SECRET_KEY ?? ""}`)
    .digest("hex")
    .slice(0, 24);
}

async function verifyTurnstile(token: string, ip: string | null) {
  const form = new URLSearchParams();
  form.append("secret", process.env.TURNSTILE_SECRET_KEY ?? "");
  form.append("response", token);
  if (ip) form.append("remoteip", ip);
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: {"Content-Type": "application/x-www-form-urlencoded"},
    body: form,
  });
  const data = await res.json();
  return data.success === true;
}

// Góp ý vừa chuyển sang "Đã làm" mà người gửi có để email → mail báo 1 lần.
// Chạy "ké" sau mỗi lần GET (không cần webhook). Cần CHILL_WISH_FROM là địa chỉ
// trên domain đã xác minh trong Resend (vd. "Bin's café <cafe@applebin.me>") —
// địa chỉ thử onboarding@resend.dev chỉ gửi được cho chính chủ tài khoản.
async function notifyShipped() {
  const from = process.env.CHILL_WISH_FROM;
  if (!from) return;
  const due = await writeClient.fetch<{_id: string; _rev: string; text: string; name?: string; email: string; reply?: string}[]>(
    `*[_type == "chillWish" && status == "shipped" && defined(email) && !defined(notifiedAt)][0...5]{_id, _rev, text, name, email, reply}`,
  );
  const resend = new Resend(process.env.RESEND_API_KEY);
  for (const w of due) {
    try {
      // Khoá lạc quan theo _rev: 2 request chạy song song thì chỉ 1 cái đánh dấu được → không gửi trùng
      await writeClient.patch(w._id).ifRevisionId(w._rev).set({notifiedAt: new Date().toISOString()}).commit();
    } catch {
      continue;
    }
    try {
      await resend.emails.send({
        from,
        to: w.email,
        replyTo: "nguyenbinhdesign@gmail.com",
        subject: "Your wish is live at the café ☕",
        text: [
          `Hi ${w.name || "there"},`,
          "",
          "You asked for:",
          `“${w.text}”`,
          "",
          "It's now live — come have a look: https://applebin.me/chill",
          ...(w.reply ? ["", `Bin: ${w.reply}`] : []),
          "",
          "Thanks for making the café a little better.",
          "— Bin",
        ].join("\n"),
      });
    } catch (error) {
      console.error("chill-wish shipped mail error:", error);
    }
  }
}
