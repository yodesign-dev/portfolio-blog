import {createHash} from "node:crypto";
import type {Redis} from "@upstash/redis";
import {NextRequest, NextResponse} from "next/server";
import {client} from "@/sanity/lib/client";
import {checkText, clean, overLimit, redis} from "@/lib/chillChat";
import {PEOPLE_MAX, QUEST_MIN_PHIN_MS, QUEST_UID_RE, type QuestOption, type QuestState} from "@/components/chill/quest-shared";

// Thử thách chung "Cả quán cùng pha phin" của trang /chill (xem quest-shared.ts).
//
// GET  → QuestState — số phin cả quán, mục tiêu, giai đoạn, lựa chọn. Phiếu chỉ lộ khi đã xong.
//        CDN giữ 30 giây.
// POST {action: "start", uid} → ghi lúc bắt đầu 1 phin (giữ 3 giờ)
// POST {action: "done", uid, name} → +1 phin cho cả quán nếu đã đủ 14 phút từ lúc "start".
//        Mỗi máy tối đa 8 phin / ngày, mỗi IP 40 (chung wifi). Cộng luôn vào số phin của máy
//        đó trong mùa + ghi tên hiển thị. Trả {counted, mine, state}.
// POST {action: "name", uid, name} → đổi tên trên bảng góp phin (chỉ khi máy đã góp phin).
// POST {action: "vote", uid, option} → 1 phiếu mỗi máy mỗi mùa, chỉ trong lúc bỏ phiếu.
//
// Redis (chung với phòng chat), khoá theo mã mùa nên đổi mã ở Studio là mùa mới từ 0:
//   <P>:<mùa>:count · <P>:<mùa>:reached (lúc đủ mục tiêu, ms) · <P>:<mùa>:votes (hash)
//   <P>:<mùa>:by (sorted set uid → số phin) · <P>:<mùa>:names (hash uid → tên)
// Tên đi qua bộ lọc từ xấu / link của chat; bị chặn thì lưu rỗng (hiện "Một vị khách").
// Máy dev ghi vào `chill:dev:quest` để không lẫn số thật.
// Studio → "Chill · Cài đặt" → "Cả quán cùng pha phin": tắt là ẩn hẳn (mặc định tắt).

const P = process.env.NODE_ENV === "development" ? "chill:dev:quest" : "chill:quest";
const DAY_S = 24 * 60 * 60;
const DAY_MS = DAY_S * 1000;
const PHINS_PER_DAY = {uid: 8, ip: 40};
const VOTES_PER_IP = 5;

type Settings = {open: boolean; season: string; title: {vi: string; en: string}; goal: number; voteDays: number; options: QuestOption[]};

const CLOSED: Settings = {open: false, season: "", title: {vi: "", en: ""}, goal: 0, voteDays: 0, options: []};

async function settings(): Promise<Settings> {
  try {
    const s = await client.fetch<Record<string, string | number | boolean | null> | null>(
      `*[_id == "chillSettings"][0]{questOpen, questSeason, questTitle, questTitleEn, questGoal, questVoteDays,
        questOpt1, questOpt1En, questOpt2, questOpt2En, questOpt3, questOpt3En, questOpt4, questOpt4En}`,
      {},
      {next: {revalidate: 30}},
    );
    const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
    const options = [1, 2, 3, 4]
      .map((i) => ({key: String(i), vi: str(s?.[`questOpt${i}`]), en: str(s?.[`questOpt${i}En`])}))
      .filter((o) => o.vi)
      .map((o) => ({...o, en: o.en || o.vi}));
    const season = str(s?.questSeason) || "mua-1";
    const vi = str(s?.questTitle) || "Mùa 1";
    // Máy dev bật thử được bằng CHILL_DEV_QUEST=1 (không đụng Studio)
    const dev = process.env.NODE_ENV === "development" && process.env.CHILL_DEV_QUEST === "1";
    return {
      // Ít hơn 2 lựa chọn thì chưa có gì để bỏ phiếu → coi như chưa mở
      open: (s?.questOpen === true || dev) && options.length >= 2 && /^[a-z0-9-]{1,24}$/.test(season),
      season,
      title: {vi, en: str(s?.questTitleEn) || vi},
      goal: Math.max(10, Math.round(Number(s?.questGoal) || 100)),
      voteDays: Math.min(14, Math.max(1, Math.round(Number(s?.questVoteDays) || 3))),
      options,
    };
  } catch {
    // Không đọc được công tắc → coi như đang tắt
    return CLOSED;
  }
}

const key = (s: Settings, part: string) => `${P}:${s.season}:${part}`;

async function stateOf(r: Redis, s: Settings): Promise<QuestState> {
  const [countRaw, reachedRaw] = await r.mget<[number | string | null, number | string | null]>(key(s, "count"), key(s, "reached"));
  const count = Number(countRaw) || 0;
  let reached = Number(reachedRaw) || 0;
  // Mục tiêu hạ xuống ở Studio (hoặc 2 phin cuối về cùng lúc) → đánh dấu lúc đủ ngay bây giờ
  if (!reached && count >= s.goal) {
    await r.set(key(s, "reached"), Date.now(), {nx: true});
    reached = Number(await r.get(key(s, "reached"))) || Date.now();
  }
  const base: QuestState = {open: true, season: s.season, title: s.title, goal: s.goal, count, phase: "brewing", options: s.options, ...(await peopleOf(r, s))};
  if (!reached) return base;
  const voteEndsAt = reached + s.voteDays * DAY_MS;
  if (Date.now() < voteEndsAt) return {...base, phase: "voting", voteEndsAt};
  const raw = (await r.hgetall<Record<string, number | string>>(key(s, "votes"))) ?? {};
  const votes = Object.fromEntries(s.options.map((o) => [o.key, Number(raw[o.key]) || 0]));
  const top = s.options.reduce<QuestOption | null>((best, o) => (votes[o.key] > (best ? votes[best.key] : 0) ? o : best), null);
  return {...base, phase: "done", voteEndsAt, votes, winner: top?.key};
}

// Khách đã góp phin, nhiều trước: tên + số phin (uid không bao giờ rời server)
async function peopleOf(r: Redis, s: Settings): Promise<Pick<QuestState, "people" | "peopleCount">> {
  const [raw, peopleCount] = await Promise.all([
    r.zrange<(string | number)[]>(key(s, "by"), 0, PEOPLE_MAX - 1, {rev: true, withScores: true}),
    r.zcard(key(s, "by")),
  ]);
  const uids: string[] = [];
  const counts: number[] = [];
  for (let i = 0; i + 1 < raw.length; i += 2) {
    uids.push(String(raw[i]));
    counts.push(Number(raw[i + 1]) || 0);
  }
  const names = uids.length ? ((await r.hmget<Record<string, string | null>>(key(s, "names"), ...uids)) ?? {}) : {};
  return {people: uids.map((uid, i) => ({name: names[uid] ?? "", n: counts[i]})), peopleCount};
}

// Tên hiển thị trên bảng góp phin; bị chặn (link, từ xấu) → rỗng
const safeName = (v: unknown) => {
  const name = clean(v, 24);
  return name && !checkText(name) ? name : "";
};

export async function GET() {
  const cache = {"Cache-Control": "public, s-maxage=30, stale-while-revalidate=60"};
  const s = await settings();
  const r = redis();
  if (!s.open || !r) return NextResponse.json({open: false}, {headers: cache});
  try {
    return NextResponse.json(await stateOf(r, s), {headers: cache});
  } catch (error) {
    console.error("chill-quest GET error:", error);
    return NextResponse.json({open: false}, {headers: {"Cache-Control": "no-store"}});
  }
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as {action?: unknown; uid?: unknown; option?: unknown; name?: unknown} | null;
  const uid = typeof body?.uid === "string" && QUEST_UID_RE.test(body.uid) ? body.uid : "";
  const s = await settings();
  const r = redis();
  // Tắt / không có Redis / thiếu mã máy → im lặng bỏ qua, phin vẫn chạy bình thường
  if (!s.open || !r || !uid) return NextResponse.json({ok: false});
  const ipHash = hashIp(request);

  try {
    if (body?.action === "start") {
      await r.set(`${P}:start:${uid}`, Date.now(), {ex: 3 * 60 * 60});
      return NextResponse.json({ok: true});
    }

    if (body?.action === "done") {
      const started = Number(await r.getdel(`${P}:start:${uid}`)) || 0;
      if (!started || Date.now() - started < QUEST_MIN_PHIN_MS) return NextResponse.json({ok: true, counted: false});
      if (
        (await overLimit(r, `${P}:day:${uid}`, PHINS_PER_DAY.uid, DAY_S)) ||
        (await overLimit(r, `${P}:dayip:${ipHash}`, PHINS_PER_DAY.ip, DAY_S))
      ) {
        return NextResponse.json({ok: true, counted: false});
      }
      const count = await r.incr(key(s, "count"));
      if (count >= s.goal) await r.set(key(s, "reached"), Date.now(), {nx: true});
      const mine = await r.zincrby(key(s, "by"), 1, uid);
      await r.hset(key(s, "names"), {[uid]: safeName(body?.name)});
      return NextResponse.json({ok: true, counted: true, mine: Number(mine) || 1, state: await stateOf(r, s)});
    }

    if (body?.action === "name") {
      // Chỉ máy đã góp phin mới có dòng trên bảng; chưa góp thì tên sẽ ghi lúc phin đầu được tính
      if ((await r.zscore(key(s, "by"), uid)) === null) return NextResponse.json({ok: true});
      if (await overLimit(r, `${P}:rename:${uid}`, 20, DAY_S)) return NextResponse.json({ok: false});
      await r.hset(key(s, "names"), {[uid]: safeName(body?.name)});
      return NextResponse.json({ok: true});
    }

    if (body?.action === "vote") {
      const option = typeof body.option === "string" ? body.option : "";
      const state = await stateOf(r, s);
      if (state.phase !== "voting" || !s.options.some((o) => o.key === option)) return NextResponse.json({ok: false});
      if (await overLimit(r, `${key(s, "vip")}:${ipHash}`, VOTES_PER_IP, 30 * DAY_S)) return NextResponse.json({ok: false, code: "ip"});
      const fresh = await r.set(`${key(s, "voted")}:${uid}`, option, {nx: true, ex: 30 * DAY_S});
      if (fresh !== "OK") return NextResponse.json({ok: false, code: "voted"});
      await r.hincrby(key(s, "votes"), option, 1);
      return NextResponse.json({ok: true, voted: option});
    }
  } catch (error) {
    console.error("chill-quest POST error:", error);
    return NextResponse.json({ok: false});
  }
  return NextResponse.json({ok: false});
}

function hashIp(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  return createHash("sha256")
    .update(`quest:${ip}:${process.env.TURNSTILE_SECRET_KEY ?? ""}`)
    .digest("hex")
    .slice(0, 24);
}
