import {Redis} from "@upstash/redis";
import {createHash, randomBytes} from "node:crypto";

// Phòng chat trang /chill — lưu trên Upstash Redis (Vercel Marketplace, biến
// chill_chat_KV_REST_API_URL / _TOKEN). Không lưu gì quá 24 giờ:
// - tin nhắn: sorted set, điểm = thời điểm gửi (ms); mỗi lần ghi xoá tin cũ hơn 24h
// - mọi khoá đều có hạn sống 24h, gia hạn mỗi lần ghi → phòng im 24h là trống trơn
// - cảm xúc / báo cáo gắn theo id tin (id bắt đầu bằng thời điểm gửi) → dọn cùng tin

export const DAY_MS = 24 * 60 * 60 * 1000;
const DAY_S = 24 * 60 * 60;
// Giữ tối đa bấy nhiêu tin gần nhất (kể cả dòng sự kiện)
const MAX_MESSAGES = 300;
// Số người online = có nhịp "hello" trong khoảng này
export const ONLINE_WINDOW_MS = 150_000;

export const K = {
  msgs: "chill:chat:msgs",
  rx: "chill:chat:rx", // hash  "<id>|<emoji>" → số lượt
  rxBy: "chill:chat:rxu", // set   "<id>|<emoji>|<người>"
  reports: "chill:chat:rep", // hash  "<id>" → số lượt báo cáo
  reportBy: "chill:chat:repu", // set "<id>|<ipHash>"
  online: "chill:chat:online", // zset người → lần cuối thấy (ms)
  joinLock: "chill:chat:joinlock",
  typing: "chill:chat:typing", // zset `who` → lần cuối gõ (ms); chỉ người đang ở bàn nhóm gửi
  pass: (p: string) => `chill:chat:pass:${p}`,
  // Máy này đã qua Turnstile trong 24h → báo cáo của máy mới được tính
  verified: (ip: string) => `chill:chat:ok:${ip}`,
  last: (ip: string) => `chill:chat:last:${ip}`,
  rate: (ip: string) => `chill:chat:rl:${ip}`,
  // Giới hạn riêng từng thao tác: hello / react / report / typing
  act: (action: string, ip: string) => `chill:chat:rl:${action}:${ip}`,
};

// Đếm số lần trong cửa sổ `seconds`; true = đã vượt `count`. Không có Redis (hoặc Redis
// lỗi) thì cho qua — mời cà phê / thả tim không được hỏng chỉ vì bộ đếm.
export async function overLimit(r: Redis | null, key: string, count: number, seconds: number) {
  if (!r) return false;
  try {
    const p = r.pipeline();
    p.incr(key);
    p.expire(key, seconds, "NX");
    const [n] = (await p.exec()) as [number, number];
    return n > count;
  } catch (error) {
    console.error("chill rate limit error:", error);
    return false;
  }
}

// Giữ tối đa bấy nhiêu người trong bộ đếm online — uid giả tạo ồ ạt cũng không phình mãi
export const MAX_ONLINE = 500;

export const REACTIONS = ["☕", "❤️", "😂", "🐱"];
export const COLORS = 8;

export type ChatMessage = {
  id: string;
  kind: "msg" | "event" | "cat";
  name?: string;
  color?: number;
  text: string;
  ts: number;
  // Mã ẩn danh của người gửi (băm 1 chiều từ uid) — để bàn nhóm biết tin của bạn nào
  // mà hiện bong bóng lời thoại, không lộ uid (uid là "chìa khoá" gửi tin / giữ ghế)
  who?: string;
};

// Cùng 1 người (cùng uid) ở chat và ở bàn nhóm → cùng `who`
export const whoOf = (uid: string) => createHash("sha256").update(`who:${uid}`).digest("hex").slice(0, 12);

let client: Redis | null | undefined;
export function redis() {
  if (client !== undefined) return client;
  const url = process.env.chill_chat_KV_REST_API_URL;
  const token = process.env.chill_chat_KV_REST_API_TOKEN;
  client = url && token ? new Redis({url, token}) : null;
  return client;
}

export const newId = (ts: number) => `${ts}-${randomBytes(4).toString("hex")}`;
export const idTime = (id: string) => Number(id.split("-")[0]) || 0;
export const ID_RE = /^\d{13}-[0-9a-f]{8}$/;

// Thêm 1 tin / dòng sự kiện, dọn tin cũ, gia hạn khoá
export async function pushMessage(r: Redis, msg: ChatMessage) {
  const p = r.pipeline();
  p.zadd(K.msgs, {score: msg.ts, member: JSON.stringify(msg)});
  p.zremrangebyscore(K.msgs, 0, msg.ts - DAY_MS);
  p.zremrangebyrank(K.msgs, 0, -(MAX_MESSAGES + 1));
  p.expire(K.msgs, DAY_S);
  await p.exec();
}

// Dòng sự kiện từ chỗ khác trên trang (vd. có người mời Bin cà phê). Không có
// Redis thì bỏ qua, không làm hỏng việc chính.
export async function pushChatEvent(text: string, kind: "event" | "cat" = "event") {
  const r = redis();
  if (!r) return;
  try {
    const ts = Date.now();
    await pushMessage(r, {id: newId(ts), kind, text, ts});
  } catch (error) {
    console.error("chill-chat event error:", error);
  }
}

// Dọn cảm xúc / báo cáo của tin đã quá 24h (id mang thời điểm gửi)
export async function sweepExtras(r: Redis) {
  const cutoff = Date.now() - DAY_MS;
  const [rxFields, repFields, rxBy, repBy] = await Promise.all([
    r.hkeys(K.rx),
    r.hkeys(K.reports),
    r.smembers(K.rxBy),
    r.smembers(K.reportBy),
  ]);
  const old = (key: string) => idTime(key.split("|")[0]) < cutoff;
  const p = r.pipeline();
  let n = 0;
  const drop = <T extends string>(list: T[], fn: (old: T[]) => void) => {
    const gone = list.filter(old);
    if (gone.length) {
      fn(gone);
      n++;
    }
  };
  drop(rxFields, (gone) => p.hdel(K.rx, ...gone));
  drop(repFields, (gone) => p.hdel(K.reports, ...gone));
  drop(rxBy as string[], (gone) => p.srem(K.rxBy, ...gone));
  drop(repBy as string[], (gone) => p.srem(K.reportBy, ...gone));
  if (n) await p.exec();
}

// Lọc tin: không link, không từ tục (giữ dấu tiếng Việt để "các", "lon bia" không bị bắt nhầm)
const LINK_RE = /https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|vn|io|me|ly|gg|xyz|co|app|link|site|top)\b/i;
const BAD_WORDS = [
  "địt", "đụ", "lồn", "cặc", "buồi", "đéo", "đĩ", "dm", "dmm", "đm", "đmm", "dcm", "đcm", "vcl", "vkl", "clm", "cmm", "đkm",
  "fuck", "fucking", "shit", "bitch", "cunt", "dick", "pussy", "nigger", "nigga", "faggot", "whore",
];
const BAD_RE = new RegExp(`(^|[^\\p{L}\\p{N}])(${BAD_WORDS.join("|")})(?=$|[^\\p{L}\\p{N}])`, "iu");

export function checkText(text: string): string | null {
  if (LINK_RE.test(text)) return "Quán chưa cho gửi đường link nha.";
  if (BAD_RE.test(text)) return "Tin có từ chưa phù hợp, bạn sửa lại giúp nha.";
  return null;
}

export const clean = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");

// Dòng sự kiện khi có người ghé quán — xen kẽ lời của mèo
const JOIN_LINES = ["Có người vừa ghé quán 👋", "Một vị khách mới vừa ngồi xuống ☕", "Cửa quán vừa mở, có khách 👋"];
const CAT_LINES = [
  "Mèo của quán ngẩng lên nhìn khách mới rồi ngủ tiếp 🐾",
  "Mèo của quán vươn vai, ngáp một cái 🐾",
  "Mèo của quán dụi đầu vào chân khách mới 🐾",
];
export const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];
export function joinEvent(): {text: string; kind: "event" | "cat"} {
  return Math.random() < 0.35 ? {text: pick(CAT_LINES), kind: "cat"} : {text: pick(JOIN_LINES), kind: "event"};
}
