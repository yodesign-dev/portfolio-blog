import {createHash, randomBytes} from "node:crypto";
import {NextRequest, NextResponse} from "next/server";
import {client} from "@/sanity/lib/client";
import {
  COLORS,
  DAY_MS,
  ID_RE,
  idTime,
  joinEvent,
  K,
  ONLINE_WINDOW_MS,
  REACTIONS,
  checkText,
  clean,
  newId,
  pushMessage,
  redis,
  sweepExtras,
  type ChatMessage,
} from "@/lib/chillChat";

// Phòng chat trang /chill (src/lib/chillChat.ts). Tin tự xoá sau 24 giờ.
//
// GET  → {open, online, messages, reactions} — CDN giữ 3s nên dù bao nhiêu người
//        đang mở chat thì Redis cũng chỉ bị đọc ~1 lần / 3s. `?fresh=1` bỏ qua CDN
//        (chỉ dùng ngay sau khi chính mình gửi).
// POST {action: "hello", uid}             nhịp "đang ở quán" ~1 phút/lần → đếm online,
//                                          khách mới → dòng "Có người vừa ghé quán"
// POST {action: "send", uid, name, color, text, pass?, captchaToken?}
//        Tin đầu tiên cần Turnstile → cấp "vé chat" 24h, các tin sau chỉ cần vé.
// POST {action: "react", uid, id, emoji, on}
// POST {action: "report", id}              3 người báo cáo → tin tự ẩn
//
// Studio → "Chill · Cài đặt" → tắt "Mở phòng chat" để đóng chat khẩn cấp.

const RATE = {count: 20, seconds: 600, gap: 3};
const REPORTS_TO_HIDE = 3;
const UID_RE = /^[a-z0-9]{8,32}$/i;

const ipHash = (request: NextRequest) => {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  return createHash("sha256")
    .update(`chat:${ip}:${process.env.TURNSTILE_SECRET_KEY ?? ""}`)
    .digest("hex")
    .slice(0, 24);
};

async function chatOpen() {
  try {
    const open = await client.fetch<boolean | null>(`*[_id == "chillSettings"][0].chatOpen`, {}, {next: {revalidate: 30}});
    return open !== false;
  } catch {
    return true;
  }
}

export async function GET(request: NextRequest) {
  const r = redis();
  const fresh = request.nextUrl.searchParams.has("fresh");
  const cache = {"Cache-Control": fresh ? "private, no-store" : "public, s-maxage=3, stale-while-revalidate=10"};
  const open = await chatOpen();
  if (!r || !open) return NextResponse.json({open: false, online: 0, messages: [], reactions: {}}, {headers: cache});
  try {
    const now = Date.now();
    const p = r.pipeline();
    p.zrange(K.msgs, now - DAY_MS, "+inf", {byScore: true});
    p.hgetall(K.rx);
    p.zcount(K.online, now - ONLINE_WINDOW_MS, "+inf");
    const [rows, rx, online] = (await p.exec()) as [unknown[], Record<string, number> | null, number];
    const messages = rows
      .map((row) => (typeof row === "string" ? (JSON.parse(row) as ChatMessage) : (row as ChatMessage)))
      .filter((m) => m && m.ts > now - DAY_MS)
      .slice(-120);
    const alive = new Set(messages.map((m) => m.id));
    const reactions: Record<string, Record<string, number>> = {};
    for (const [field, count] of Object.entries(rx ?? {})) {
      const [id, emoji] = field.split("|");
      if (!alive.has(id) || Number(count) <= 0) continue;
      (reactions[id] ??= {})[emoji] = Number(count);
    }
    return NextResponse.json({open: true, online: Math.max(online, 0), messages, reactions}, {headers: cache});
  } catch (error) {
    console.error("chill-chat GET error:", error);
    return NextResponse.json({open: true, online: 0, messages: [], reactions: {}, error: true}, {status: 500});
  }
}

export async function POST(request: NextRequest) {
  const r = redis();
  if (!r) return NextResponse.json({error: "Chat chưa sẵn sàng."}, {status: 503});
  try {
    const body = (await request.json()) as Record<string, unknown>;
    // Honeypot: field ẩn bị điền → bot
    if (body.company) return NextResponse.json({ok: true});
    const uid = typeof body.uid === "string" && UID_RE.test(body.uid) ? body.uid : "";
    switch (body.action) {
      case "hello":
        return hello(uid);
      case "send":
        return send(request, uid, body);
      case "react":
        return react(request, uid, body);
      case "report":
        return report(request, body);
    }
    return NextResponse.json({error: "Unknown action"}, {status: 400});
  } catch (error) {
    console.error("chill-chat POST error:", error);
    return NextResponse.json({error: "Chưa gửi được, thử lại nha."}, {status: 500});
  }

  async function hello(uid: string) {
    if (!uid || !r) return NextResponse.json({ok: true});
    const now = Date.now();
    const p = r.pipeline();
    p.zremrangebyscore(K.online, 0, now - ONLINE_WINDOW_MS);
    p.zadd(K.online, {score: now, member: uid});
    p.expire(K.online, 600);
    const [, added] = (await p.exec()) as [number, number, number];
    // Khách mới vào → dòng sự kiện, tối đa 1 dòng / 3 phút cho cả quán
    if (added === 1 && (await chatOpen()) && (await r.set(K.joinLock, "1", {nx: true, ex: 180}))) {
      const ev = joinEvent();
      await pushMessage(r, {id: newId(now), kind: ev.kind, text: ev.text, ts: now});
    }
    return NextResponse.json({ok: true});
  }
}

async function send(request: NextRequest, uid: string, body: Record<string, unknown>) {
  const r = redis()!;
  if (!(await chatOpen())) return NextResponse.json({error: "Phòng chat đang tạm đóng."}, {status: 403});
  const text = clean(body.text, 200);
  const name = clean(body.name, 24);
  const color = Math.max(0, Math.min(COLORS - 1, Math.round(Number(body.color) || 0)));
  if (!uid || !text) return NextResponse.json({error: "Bạn chưa nhập gì."}, {status: 400});
  if (!name) return NextResponse.json({error: "Bạn đặt tên trước nha."}, {status: 400});
  const bad = checkText(`${name} ${text}`);
  if (bad) return NextResponse.json({error: bad}, {status: 400});

  const ip = ipHash(request);
  // Vé chat còn hạn → khỏi Turnstile; chưa có → xác minh rồi cấp vé 24h
  let pass = typeof body.pass === "string" && /^[0-9a-f]{32}$/.test(body.pass) ? body.pass : "";
  let issued: string | undefined;
  if (!pass || !(await r.get(K.pass(pass)))) {
    const token = typeof body.captchaToken === "string" ? body.captchaToken : "";
    if (!token || !(await verifyTurnstile(token, request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null))) {
      return NextResponse.json({error: "Xác minh giúp mình bạn không phải robot nha.", needCaptcha: true}, {status: 401});
    }
    pass = randomBytes(16).toString("hex");
    await r.set(K.pass(pass), ip, {ex: 24 * 60 * 60});
    issued = pass;
  }

  // 1 tin / 3 giây, 20 tin / 10 phút cho mỗi máy
  if (!(await r.set(K.last(ip), "1", {nx: true, ex: RATE.gap}))) {
    return NextResponse.json({error: "Chậm lại chút nha ☕", pass: issued}, {status: 429});
  }
  const p = r.pipeline();
  p.incr(K.rate(ip));
  p.expire(K.rate(ip), RATE.seconds, "NX");
  const [count] = (await p.exec()) as [number, number];
  if (count > RATE.count) return NextResponse.json({error: "Bạn nhắn hơi nhiều rồi, nghỉ tay chút nha ☕", pass: issued}, {status: 429});

  const ts = Date.now();
  const msg: ChatMessage = {id: newId(ts), kind: "msg", name, color, text, ts};
  await pushMessage(r, msg);
  if (Math.random() < 0.2) await sweepExtras(r).catch(() => {});
  return NextResponse.json({message: msg, pass: issued});
}

async function react(request: NextRequest, uid: string, body: Record<string, unknown>) {
  const r = redis()!;
  const id = typeof body.id === "string" && ID_RE.test(body.id) ? body.id : "";
  const emoji = typeof body.emoji === "string" && REACTIONS.includes(body.emoji) ? body.emoji : "";
  if (!uid || !id || !emoji || idTime(id) < Date.now() - DAY_MS) return NextResponse.json({error: "Bad reaction"}, {status: 400});
  const who = `${id}|${emoji}|${ipHash(request)}:${uid}`;
  const changed = body.on === false ? await r.srem(K.rxBy, who) : await r.sadd(K.rxBy, who);
  if (changed) {
    const p = r.pipeline();
    p.hincrby(K.rx, `${id}|${emoji}`, body.on === false ? -1 : 1);
    p.expire(K.rx, 24 * 60 * 60);
    p.expire(K.rxBy, 24 * 60 * 60);
    await p.exec();
  }
  return NextResponse.json({ok: true});
}

async function report(request: NextRequest, body: Record<string, unknown>) {
  const r = redis()!;
  const id = typeof body.id === "string" && ID_RE.test(body.id) ? body.id : "";
  if (!id) return NextResponse.json({error: "Bad id"}, {status: 400});
  if (!(await r.sadd(K.reportBy, `${id}|${ipHash(request)}`))) return NextResponse.json({ok: true});
  const p = r.pipeline();
  p.hincrby(K.reports, id, 1);
  p.expire(K.reports, 24 * 60 * 60);
  p.expire(K.reportBy, 24 * 60 * 60);
  const [count] = (await p.exec()) as [number, number, number];
  if (count >= REPORTS_TO_HIDE) {
    // Tìm đúng tin theo thời điểm gửi rồi xoá khỏi phòng
    const ts = idTime(id);
    const rows = await r.zrange<unknown[]>(K.msgs, ts, ts, {byScore: true});
    const row = rows.find((m) => (typeof m === "string" ? (JSON.parse(m) as ChatMessage) : (m as ChatMessage)).id === id);
    if (row) await r.zrem(K.msgs, typeof row === "string" ? row : JSON.stringify(row));
  }
  return NextResponse.json({ok: true});
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
