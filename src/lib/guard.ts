import {createHash} from "node:crypto";

// Dùng chung cho các API nhận dữ liệu từ khách (contact, /api/chill-*, track-view):
// IP của khách, mã băm IP để giới hạn / chống trùng, và xác minh Turnstile.

// Trên Vercel, x-forwarded-for do proxy của Vercel ghi đè (khách không giả được);
// lấy phần tử đầu = IP thật của khách.
export const clientIp = (request: Request) => request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;

// Băm 1 chiều để không lưu IP trần (Redis, Sanity). Muối là IP_HASH_SALT — tách khỏi khoá
// captcha để đổi khoá Turnstile không làm mọi giới hạn / dấu "đã tính" về 0. Chưa đặt biến
// đó thì dùng TURNSTILE_SECRET_KEY như trước, nên mã băm đang lưu vẫn khớp.
// `scope` giữ đúng công thức cũ của từng route ("chat", "diary"…; wishlist / ủng hộ không có).
export function hashIp(request: Request, scope?: string) {
  const ip = clientIp(request) ?? "unknown";
  const salt = process.env.IP_HASH_SALT ?? process.env.TURNSTILE_SECRET_KEY ?? "";
  return createHash("sha256")
    .update(scope ? `${scope}:${ip}:${salt}` : `${ip}:${salt}`)
    .digest("hex")
    .slice(0, 24);
}

// Tên miền được phép giải captcha. Cloudflare đã chặn widget ở domain không khai trong
// sitekey; kiểm thêm `hostname` ở server phòng khi sitekey bị khai rộng / dùng nhầm sitekey.
// Thêm domain khác bằng TURNSTILE_HOSTNAMES="a.com,b.com".
function allowedHost(hostname: string | undefined) {
  if (!hostname) return false;
  const allowed = new Set(
    [
      "applebin.me",
      "www.applebin.me",
      process.env.VERCEL_URL,
      process.env.VERCEL_BRANCH_URL,
      process.env.VERCEL_PROJECT_PRODUCTION_URL,
      ...(process.env.TURNSTILE_HOSTNAMES ?? "").split(","),
      // `next start` trên máy (không phải Vercel)
      ...(process.env.VERCEL ? [] : ["localhost", "127.0.0.1"]),
    ]
      .map((h) => h?.trim().toLowerCase())
      .filter(Boolean),
  );
  return allowed.has(hostname.toLowerCase());
}

export async function verifyTurnstile(token: string, request: Request) {
  try {
    const form = new URLSearchParams();
    form.append("secret", process.env.TURNSTILE_SECRET_KEY ?? "");
    form.append("response", token);
    const ip = clientIp(request);
    if (ip) form.append("remoteip", ip);
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: {"Content-Type": "application/x-www-form-urlencoded"},
      body: form,
    });
    const data = (await res.json()) as {success?: boolean; hostname?: string};
    if (data.success !== true) return false;
    // Máy dev dùng khoá thử của Cloudflare (hostname "example.com") → bỏ qua bước này
    if (process.env.NODE_ENV !== "production") return true;
    if (!allowedHost(data.hostname)) {
      console.warn("turnstile: token from unexpected hostname", data.hostname);
      return false;
    }
    return true;
  } catch (error) {
    console.error("turnstile verify error:", error);
    return false;
  }
}
