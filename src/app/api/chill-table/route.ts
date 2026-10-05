import {createHash} from "node:crypto";
import {NextRequest, NextResponse} from "next/server";
import {client} from "@/sanity/lib/client";
import {checkText, clean, redis} from "@/lib/chillChat";
import {
  CHARACTERS,
  DEFAULT_MAX_MEMBERS,
  STALE_MS,
  STATUSES,
  TABLE_RE,
  TK,
  newTableId,
  publicView,
  readMembers,
  settle,
  withLock,
  writeMembers,
  type Member,
  type Status,
} from "@/lib/chillTable";

// Bàn nhóm trang /chill (src/lib/chillTable.ts). Thử nghiệm — Studio → "Chill ·
// Cài đặt" → "Mở bàn nhóm". Tắt thì GET trả {open: false}, POST bị từ chối, và
// trang hiện y như trước khi có tính năng này.
//
// GET  ?id=<bàn>&uid=<mình>  → {open, max, members: [{name, character, status, seat, you}]}
//      không có id → chỉ {open, max} (để trang biết có hiện nút "Mời bạn" không)
// POST {action: "create", uid, name, character}          → {id, members}
// POST {action: "join",   id, uid, name, character}      → {members} | 409 bàn đã đủ người
// POST {action: "beat",   id, uid, status}               nhịp ~1 phút/lần, giữ ghế
// POST {action: "leave",  id, uid}

const UID_RE = /^[a-z0-9]{8,32}$/i;
// Mỗi máy tạo tối đa 10 bàn / giờ
const CREATE_RATE = {count: 10, seconds: 3600};

const ipHash = (request: NextRequest) => {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  return createHash("sha256")
    .update(`table:${ip}:${process.env.TURNSTILE_SECRET_KEY ?? ""}`)
    .digest("hex")
    .slice(0, 24);
};

async function settings() {
  try {
    const s = await client.fetch<{open?: boolean | null; max?: number | null} | null>(
      `*[_id == "chillSettings"][0]{"open": groupTableOpen, "max": groupMaxMembers}`,
      {},
      {next: {revalidate: 30}},
    );
    // Mặc định TẮT — khác chat: tính năng thử nghiệm chỉ chạy khi được bật rõ ràng.
    // Máy dev có thể bật riêng bằng CHILL_TABLE_DEV_OPEN=1 mà không đụng Studio.
    const devOpen = process.env.NODE_ENV === "development" && process.env.CHILL_TABLE_DEV_OPEN === "1";
    return {open: s?.open === true || devOpen, max: s?.max && s.max >= 2 ? Math.min(12, Math.round(s.max)) : DEFAULT_MAX_MEMBERS};
  } catch {
    return {open: false, max: DEFAULT_MAX_MEMBERS};
  }
}

const noStore = {"Cache-Control": "private, no-store"};

export async function GET(request: NextRequest) {
  const {open, max} = await settings();
  const r = redis();
  const id = request.nextUrl.searchParams.get("id") ?? "";
  const uid = request.nextUrl.searchParams.get("uid") ?? "";
  if (!r || !open) return NextResponse.json({open: false}, {headers: noStore});
  if (!TABLE_RE.test(id)) return NextResponse.json({open: true, max}, {headers: noStore});
  try {
    const {members} = settle(await readMembers(r, id), Date.now());
    if (!Object.keys(members).length) return NextResponse.json({open: true, max, gone: true}, {headers: noStore});
    return NextResponse.json({open: true, max, members: publicView(members, uid)}, {headers: noStore});
  } catch (error) {
    console.error("chill-table GET error:", error);
    return NextResponse.json({open: true, max, error: true}, {status: 500});
  }
}

export async function POST(request: NextRequest) {
  const {open, max} = await settings();
  const r = redis();
  if (!r || !open) return NextResponse.json({error: "Bàn nhóm đang tạm đóng."}, {status: 403});
  try {
    const body = (await request.json()) as Record<string, unknown>;
    if (body.company) return NextResponse.json({ok: true});
    const uid = typeof body.uid === "string" && UID_RE.test(body.uid) ? body.uid : "";
    const id = typeof body.id === "string" && TABLE_RE.test(body.id) ? body.id : "";
    if (!uid) return NextResponse.json({error: "Bad uid"}, {status: 400});

    if (body.action === "create" || body.action === "join") {
      const name = clean(body.name, 24);
      if (!name) return NextResponse.json({error: "Bạn đặt tên trước nha."}, {status: 400});
      const bad = checkText(name);
      if (bad) return NextResponse.json({error: bad}, {status: 400});
      const character = Math.max(0, Math.min(CHARACTERS - 1, Math.round(Number(body.character) || 0)));

      if (body.action === "create") {
        const p = r.pipeline();
        p.incr(TK.rate(ipHash(request)));
        p.expire(TK.rate(ipHash(request)), CREATE_RATE.seconds, "NX");
        const [count] = (await p.exec()) as [number, number];
        if (count > CREATE_RATE.count) return NextResponse.json({error: "Bạn tạo nhiều bàn quá rồi, thử lại sau nha."}, {status: 429});
        const tableId = newTableId();
        const now = Date.now();
        const {members} = settle({[uid]: {name, character, status: "work", seat: -1, joined: now, seen: now}}, now);
        await writeMembers(r, tableId, members);
        return NextResponse.json({id: tableId, max, members: publicView(members, uid)});
      }

      if (!id) return NextResponse.json({error: "Link mời không hợp lệ."}, {status: 400});
      const result = await withLock(r, id, async () => {
        const now = Date.now();
        const current = settle(await readMembers(r, id), now).members;
        if (!Object.keys(current).length) return {status: 404, error: "Bàn này đã giải tán rồi."};
        const mine = current[uid];
        if (!mine && Object.keys(current).length >= max) return {status: 409, error: "Bàn đã đủ người.", full: true};
        current[uid] = mine ? {...mine, name, seen: now} : {name, character, status: "work", seat: -1, joined: now, seen: now};
        const {members} = settle(current, now);
        await writeMembers(r, id, members);
        return {members: publicView(members, uid)};
      });
      if (!result) return NextResponse.json({error: "Quán đang đông, thử lại nha."}, {status: 503});
      if ("status" in result) return NextResponse.json({error: result.error, full: result.full}, {status: result.status});
      return NextResponse.json({max, members: result.members});
    }

    if (body.action === "beat" || body.action === "leave") {
      if (!id) return NextResponse.json({error: "Bad id"}, {status: 400});
      const status = STATUSES.includes(body.status as Status) ? (body.status as Status) : undefined;
      const result = await withLock(r, id, async () => {
        const now = Date.now();
        const current = await readMembers(r, id);
        const mine: Member | undefined = current[uid];
        // Mất nhịp quá lâu (bị mời ra) thì phải "join" lại
        if (!mine || (body.action === "beat" && mine.seen < now - STALE_MS)) {
          if (body.action === "leave") return {members: publicView(settle(current, now).members, uid)};
          return {status: 410, error: "Bạn đã rời bàn."};
        }
        if (body.action === "leave") delete current[uid];
        else current[uid] = {...mine, seen: now, status: status ?? mine.status};
        const {members} = settle(current, now);
        await writeMembers(r, id, members);
        return {members: publicView(members, uid)};
      });
      if (!result) return NextResponse.json({error: "Quán đang đông, thử lại nha."}, {status: 503});
      if ("status" in result) return NextResponse.json({error: result.error}, {status: result.status});
      return NextResponse.json({max, members: result.members});
    }

    return NextResponse.json({error: "Unknown action"}, {status: 400});
  } catch (error) {
    console.error("chill-table POST error:", error);
    return NextResponse.json({error: "Chưa được, thử lại nha."}, {status: 500});
  }
}
