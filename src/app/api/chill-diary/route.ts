import {createHash, randomUUID} from "node:crypto";
import {after, NextRequest, NextResponse} from "next/server";
import {Resend} from "resend";
import {client} from "@/sanity/lib/client";
import {writeClient} from "@/sanity/lib/writeClient";
import {checkText, clean, overLimit, redis} from "@/lib/chillChat";
import {KEEP_DAYS, NOTE_MAX, NOTE_MIN, NOTES_PER_DAY, dayOf, isMood, type DiaryNote, type Quote} from "@/components/chill/diary-shared";

// Bảng nhật ký của trang /chill (xem src/components/chill/diary-shared.ts).
//
// GET  → {open, notes, cafe, quote} — mẩu giấy công khai của 7 ngày gần nhất (không bao giờ
//        trả uidHash / ipHash) + câu riêng của quán / câu danh ngôn nếu Studio có điền. CDN giữ 15s.
// POST {action: "post", uid, name, text, mood, captchaToken} → treo 1 mẩu lên bảng
//        (hiện ngay, không chờ duyệt). Mỗi người 2 mẩu / ngày theo giờ Hà Nội.
// POST {action: "report", id} → báo cáo; đủ 2 máy khác nhau thì mẩu tự ẩn.
// Lỗi trả kèm `code` (closed / short / bad / captcha / slow / full) để giao diện dịch.
//
// Mẩu "cất vào sổ" không đi qua đây — chỉ nằm trên máy người viết.
// Studio → "Chill · Cài đặt" → "Mở bảng nhật ký": tắt là đóng hẳn (mặc định tắt).
//
// Document có ID dạng `chillNote.<uuid>` — dấu chấm khiến dataset public không cho đọc
// khi không có token, nên phải đọc/ghi bằng writeClient ở đây.

const ID_RE = /^chillNote\.[0-9a-f-]{36}$/;
const UID_RE = /^[a-z0-9]{8,32}$/i;
// Chung wifi (quán, văn phòng) vẫn viết được, nhưng 1 IP không treo quá bấy nhiêu mẩu / ngày
const IP_NOTES_PER_DAY = 8;
const POST_RATE = {count: 6, seconds: 600};
const REPORT_RATE = {count: 10, seconds: 600};
const REPORTS_TO_HIDE = 2;
const KEEP_MS = KEEP_DAYS * 24 * 60 * 60 * 1000;

const LIST_QUERY = `*[_type == "chillNote" && hidden != true && _createdAt > $since] | order(_createdAt desc)[0...400] {
  "id": _id, text, mood, "name": coalesce(name, ""), day, "ts": dateTime(_createdAt)
}`;

type Settings = {open: boolean; cafe: {vi: string; en: string} | null; quote: Quote | null};

async function settings(): Promise<Settings> {
  try {
    const s = await client.fetch<{open?: boolean; vi?: string; en?: string; qEn?: string; qVi?: string; qBy?: string} | null>(
      `*[_id == "chillSettings"][0]{"open": diaryOpen, "vi": diaryNoteVi, "en": diaryNoteEn, "qEn": diaryQuoteEn, "qVi": diaryQuoteVi, "qBy": diaryQuoteBy}`,
      {},
      {next: {revalidate: 30}},
    );
    const vi = s?.vi?.trim();
    const qEn = s?.qEn?.trim();
    return {
      open: s?.open === true,
      cafe: vi ? {vi, en: s?.en?.trim() || vi} : null,
      quote: qEn ? {en: qEn, vi: s?.qVi?.trim() || "", by: s?.qBy?.trim() || ""} : null,
    };
  } catch {
    // Không đọc được công tắc → coi như đang tắt (tính năng thử nghiệm, an toàn là trên hết)
    return {open: false, cafe: null, quote: null};
  }
}

export async function GET() {
  const cache = {"Cache-Control": "public, s-maxage=15, stale-while-revalidate=60"};
  const {open, cafe, quote} = await settings();
  if (!open) return NextResponse.json({open: false, notes: [], cafe: null, quote: null}, {headers: cache});
  try {
    const since = new Date(Date.now() - KEEP_MS).toISOString();
    const rows = await writeClient.fetch<(Omit<DiaryNote, "ts"> & {ts: string})[]>(LIST_QUERY, {since});
    const notes: DiaryNote[] = rows
      .filter((n) => isMood(n.mood) && typeof n.text === "string")
      .map((n) => ({...n, ts: Date.parse(n.ts), day: n.day || dayOf(Date.parse(n.ts))}));
    return NextResponse.json({open: true, notes, cafe, quote}, {headers: cache});
  } catch (error) {
    console.error("chill-diary list error:", error);
    return NextResponse.json({open: true, notes: [], cafe, quote, error: true}, {status: 500});
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    if (body?.action === "post") return post(request, body);
    if (body?.action === "report") return report(request, body);
    return NextResponse.json({error: "Unknown action"}, {status: 400});
  } catch (error) {
    console.error("chill-diary error:", error);
    return NextResponse.json({error: "Chưa treo được, thử lại nha."}, {status: 500});
  }
}

async function post(request: NextRequest, {uid, name, text, mood, captchaToken, company}: Record<string, unknown>) {
  // Honeypot: field ẩn bị điền → bot. Trả "thành công" giả, không ghi gì.
  if (company) return NextResponse.json({success: true, note: null});
  if (!(await settings()).open) return NextResponse.json({error: "Bảng nhật ký đang đóng.", code: "closed"}, {status: 403});

  const note = clean(text, NOTE_MAX);
  const who = clean(name, 24);
  if (typeof uid !== "string" || !UID_RE.test(uid) || !isMood(mood)) {
    return NextResponse.json({error: "Chưa treo được, thử lại nha."}, {status: 400});
  }
  if (note.length < NOTE_MIN) return NextResponse.json({error: "Viết thêm vài chữ nữa nha.", code: "short"}, {status: 400});
  const bad = checkText(note) ?? (who ? checkText(who) : null);
  if (bad) return NextResponse.json({error: bad, code: "bad"}, {status: 400});
  if (typeof captchaToken !== "string" || !captchaToken) {
    return NextResponse.json({error: "Chưa xác minh được bạn là người thật — tải lại trang rồi thử lại nha.", code: "captcha"}, {status: 400});
  }

  const ipHash = hashIp(request);
  if (await overLimit(redis(), `chill:diary:rl:post:${ipHash}`, POST_RATE.count, POST_RATE.seconds)) {
    return NextResponse.json({error: "Từ từ thôi nha, lát nữa viết tiếp ☕", code: "slow"}, {status: 429});
  }
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  if (!(await verifyTurnstile(captchaToken, ip))) {
    return NextResponse.json({error: "Chưa xác minh được bạn là người thật — tải lại trang rồi thử lại nha.", code: "captcha"}, {status: 400});
  }

  const now = Date.now();
  const day = dayOf(now);
  const uidHash = createHash("sha256").update(`diary:${uid}`).digest("hex").slice(0, 24);
  const used = await writeClient.fetch<{mine: number; ip: number}>(
    `{"mine": count(*[_type == "chillNote" && day == $day && uidHash == $uidHash]),
      "ip": count(*[_type == "chillNote" && day == $day && ipHash == $ipHash])}`,
    {day, uidHash, ipHash},
  );
  if (used.mine >= NOTES_PER_DAY || used.ip >= IP_NOTES_PER_DAY) {
    return NextResponse.json({error: "Hôm nay bạn treo đủ mẩu rồi. Mai ghé viết tiếp nha.", code: "full"}, {status: 429});
  }

  const id = `chillNote.${randomUUID()}`;
  await writeClient.create({_id: id, _type: "chillNote", hidden: false, text: note, mood, name: who || undefined, day, reports: 0, uidHash, ipHash});

  after(async () => {
    // Dọn mẩu quá 7 ngày — chạy "ké" mỗi lần có người treo mẩu mới, không cần cron
    try {
      await writeClient.delete({query: `*[_type == "chillNote" && _createdAt < $cutoff]`, params: {cutoff: new Date(now - KEEP_MS).toISOString()}});
    } catch (error) {
      console.error("chill-diary sweep error:", error);
    }
    // Mẩu hiện ngay không qua duyệt → mail báo Bin để gỡ sớm nếu cần
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: "Bin Nguyen Contact <onboarding@resend.dev>",
        to: "nguyenbinhdesign@gmail.com",
        subject: `[Chill nhật ký] ${note.slice(0, 60)}`,
        text: [`Người viết: ${who || "Khách"} · tâm trạng: ${mood}`, "", note, "", "Gỡ trong Studio → Chill · Nhật ký → 📌 Đang treo: https://applebin.me/studio"].join("\n"),
      });
    } catch (error) {
      console.error("chill-diary notify error:", error);
    }
  });

  const created: DiaryNote = {id, text: note, mood, name: who, day, ts: now};
  return NextResponse.json({success: true, note: created});
}

async function report(request: NextRequest, {id}: Record<string, unknown>) {
  if (typeof id !== "string" || !ID_RE.test(id)) return NextResponse.json({error: "Invalid id"}, {status: 400});
  const r = redis();
  const ipHash = hashIp(request);
  // Quá nhịp → lặng lẽ bỏ qua (người báo cáo vẫn thấy mẩu biến mất trên máy mình)
  if (await overLimit(r, `chill:diary:rl:report:${ipHash}`, REPORT_RATE.count, REPORT_RATE.seconds)) return NextResponse.json({ok: true});
  // Mỗi máy chỉ tính 1 lượt cho mỗi mẩu. Không có Redis thì không đếm được máy → vẫn cộng
  if (r) {
    const key = `chill:diary:rep:${id}`;
    const fresh = await r
      .sadd(key, ipHash)
      .then(async (n) => (await r.expire(key, KEEP_DAYS * 24 * 60 * 60), n))
      .catch(() => 1);
    if (!fresh) return NextResponse.json({ok: true});
  }
  const exists = await writeClient.fetch<string | null>(`*[_id == $id && _type == "chillNote"][0]._id`, {id});
  if (!exists) return NextResponse.json({ok: true});
  const doc = await writeClient.patch(id).setIfMissing({reports: 0}).inc({reports: 1}).commit<{reports: number}>();
  if (doc.reports >= REPORTS_TO_HIDE) await writeClient.patch(id).set({hidden: true}).commit();
  return NextResponse.json({ok: true});
}

function hashIp(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  return createHash("sha256")
    .update(`diary:${ip}:${process.env.TURNSTILE_SECRET_KEY ?? ""}`)
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
