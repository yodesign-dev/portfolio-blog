// Cache ngắn trong bộ nhớ của từng instance server cho các GET công khai đọc Redis
// (/api/chill-chat, chill-plays, chill-quest).
//
// Vì sao: CDN của Vercel tính cả query string vào khoá cache, nên `?x=<ngẫu nhiên>` là
// MISS mọi lần → mỗi request đều chạm Upstash (tính tiền theo lệnh). Với cache này,
// một instance chỉ đọc Redis tối đa 1 lần / `ttlMs` cho mỗi khoá, và các request đến
// cùng lúc dùng chung 1 lần đọc đang chạy. Đọc Sanity thì dùng Data Cache của Next
// (`{next: {revalidate}}` trong fetch) — cache đó dùng chung giữa các instance.
//
// Chỉ dùng với khoá CỐ ĐỊNH (không ghép input của khách vào khoá) để Map không phình.

type Entry = {at: number; value: Promise<unknown>};
const store = new Map<string, Entry>();

export function microCache<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const hit = store.get(key);
  if (hit && now - hit.at < ttlMs) return hit.value as Promise<T>;
  const value = load();
  store.set(key, {at: now, value});
  // Lỗi thì bỏ khỏi cache ngay để lần sau đọc lại
  value.catch(() => {
    if (store.get(key)?.value === value) store.delete(key);
  });
  return value;
}
