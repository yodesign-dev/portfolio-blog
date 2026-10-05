import {randomBytes} from "node:crypto";
import type {Redis} from "@upstash/redis";

// Bàn nhóm trang /chill (thử nghiệm, bật/tắt bằng "Mở bàn nhóm" trong Studio).
// Dùng chung Redis với phòng chat (src/lib/chillChat.ts) nhưng khoá riêng
// tiền tố "chill:table:" — gỡ tính năng thì khoá tự hết hạn, không đụng chat.
//
// Mỗi bàn là 1 hash: uid → Member (JSON). Ai vào trước ngồi trước và giữ ghế
// đến khi rời bàn / mất nhịp; ghế trống thì người vào sớm nhất đang đứng chờ
// (nhãn "+n") được mời ngồi. Bàn im 7 ngày thì tự xoá.

export const SEATS = 4;
export const DEFAULT_MAX_MEMBERS = 8;
// 6 nhân vật có sẵn — nhiều hơn số ghế nên 4 người ngồi không bao giờ trùng nhau
export const CHARACTERS = 6;
export const STATUSES = ["work", "coffee", "sleep", "away"] as const;
export type Status = (typeof STATUSES)[number];

// Còn ở bàn = có nhịp trong khoảng này (client gửi nhịp ~1 phút/lần)
export const STALE_MS = 150_000;
export const TABLE_TTL_S = 7 * 24 * 60 * 60;

export const TABLE_RE = /^[a-z0-9]{8}$/;

export const TK = {
  members: (id: string) => `chill:table:${id}:m`,
  lock: (id: string) => `chill:table:${id}:lock`,
  rate: (ip: string) => `chill:table:rl:${ip}`,
};

export type Member = {
  name: string;
  character: number;
  status: Status;
  seat: number; // 0…SEATS-1, hoặc -1 = đang ở nhóm "+n"
  joined: number;
  seen: number;
};

export const newTableId = () =>
  Array.from(randomBytes(8), (b) => "abcdefghijklmnopqrstuvwxyz0123456789"[b % 36]).join("");

// Bỏ người mất nhịp, mời người chờ vào ghế trống, tránh 2 người ngồi cùng nhân vật.
// Hàm thuần — trả về danh sách mới và cờ `changed` để biết có cần ghi lại không.
export function settle(members: Record<string, Member>, now: number) {
  let changed = false;
  const alive: Record<string, Member> = {};
  for (const [uid, m] of Object.entries(members)) {
    if (m.seen >= now - STALE_MS) alive[uid] = {...m};
    else changed = true;
  }
  const byJoin = Object.entries(alive).sort(([, a], [, b]) => a.joined - b.joined);
  const taken = new Set(byJoin.filter(([, m]) => m.seat >= 0).map(([, m]) => m.seat));
  for (const [, m] of byJoin) {
    if (m.seat >= 0 || taken.size >= SEATS) continue;
    const seat = [...Array(SEATS).keys()].find((s) => !taken.has(s))!;
    m.seat = seat;
    taken.add(seat);
    changed = true;
  }
  // Nhân vật trùng giữa những người đang ngồi → người vào sau đổi sang nhân vật còn trống
  const used = new Set<number>();
  for (const [, m] of byJoin) {
    if (m.seat < 0) continue;
    if (used.has(m.character)) {
      m.character = [...Array(CHARACTERS).keys()].find((c) => !used.has(c))!;
      changed = true;
    }
    used.add(m.character);
  }
  return {members: alive, changed};
}

// Thứ người khác thấy — không lộ uid (uid là "chìa khoá" để gửi nhịp / rời bàn)
export function publicView(members: Record<string, Member>, uid: string) {
  return Object.entries(members)
    .sort(([, a], [, b]) => a.joined - b.joined)
    .map(([id, m]) => ({name: m.name, character: m.character, status: m.status, seat: m.seat, you: id === uid}));
}

export async function readMembers(r: Redis, id: string) {
  const raw = (await r.hgetall<Record<string, unknown>>(TK.members(id))) ?? {};
  const out: Record<string, Member> = {};
  for (const [uid, v] of Object.entries(raw)) {
    out[uid] = typeof v === "string" ? (JSON.parse(v) as Member) : (v as Member);
  }
  return out;
}

// Ghi lại toàn bộ bàn (bàn tối đa 12 người nên rẻ), gia hạn 7 ngày
export async function writeMembers(r: Redis, id: string, members: Record<string, Member>) {
  const key = TK.members(id);
  const p = r.multi();
  p.del(key);
  const fields = Object.fromEntries(Object.entries(members).map(([uid, m]) => [uid, JSON.stringify(m)]));
  if (Object.keys(fields).length) {
    p.hset(key, fields);
    p.expire(key, TABLE_TTL_S);
  }
  await p.exec();
}

// Khoá ngắn quanh mỗi lần sửa bàn để 2 người vào cùng lúc không giành 1 ghế
export async function withLock<T>(r: Redis, id: string, fn: () => Promise<T>): Promise<T | null> {
  for (let i = 0; i < 5; i++) {
    if (await r.set(TK.lock(id), "1", {nx: true, px: 3000})) {
      try {
        return await fn();
      } finally {
        await r.del(TK.lock(id));
      }
    }
    await new Promise((res) => setTimeout(res, 120 + i * 80));
  }
  return null;
}
