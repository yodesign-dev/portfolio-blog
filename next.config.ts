import type { NextConfig } from "next";

// Content-Security-Policy — whitelist cdn.sanity.io vì ảnh bài viết load từ Sanity CMS,
// và www.google.com + *.gstatic.com cho favicon của Tools/Timeline (Google S2
// favicon service redirect sang tN.gstatic.com).
// media-src cdn.sanity.io: file nhạc của trang /chill upload trong Sanity Studio.
// img.vietqr.io: ảnh QR chuyển khoản Vietcombank ở mục "Buy Bin a coffee" trang /chill.
// Nếu sau này bạn gọi trực tiếp Sanity API từ client (client-side fetch), nhớ thêm
// domain API tương ứng (vd: https://<project-id>.api.sanity.io) vào connect-src.
//
// MỚI: thêm domain cho 2 tích hợp mới —
// - Cloudflare Turnstile (captcha trong form liên hệ): challenges.cloudflare.com
// - Cal.com (nút "Book a 30-min call"): app.cal.com + *.cal.com cho API kiểm tra lịch
// - Google tag (gtag.js, Google Ads) ở trang /chill: www.googletagmanager.com tải script,
//   gửi số đo về google-analytics.com, googleadservices.com, *.doubleclick.net, google.com
// - fonts.googleapis.com / fonts.gstatic.com: 1 trong 2 script trên tự chèn thêm
//   stylesheet Google Fonts riêng, không phải do next/font (next/font tự host font
//   nội bộ nên bình thường không cần dòng này).
const csp = (frameAncestors: string) => `
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com https://app.cal.com https://www.googletagmanager.com https://*.googleadservices.com https://*.doubleclick.net;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  img-src 'self' blob: data: https://cdn.sanity.io https://www.google.com https://*.gstatic.com https://img.vietqr.io https://www.googletagmanager.com https://*.google-analytics.com https://*.doubleclick.net https://*.google.com.vn;
  font-src 'self' https://fonts.gstatic.com;
  media-src 'self' https://cdn.sanity.io;
  connect-src 'self' https://*.api.sanity.io https://challenges.cloudflare.com https://*.cal.com https://www.googletagmanager.com https://*.google-analytics.com https://*.analytics.google.com https://www.google.com https://*.doubleclick.net https://*.googleadservices.com;
  frame-src https://challenges.cloudflare.com https://app.cal.com https://td.doubleclick.net https://www.googletagmanager.com;
  frame-ancestors ${frameAncestors};
  form-action 'self';
  base-uri 'self';
`.replace(/\n/g, " ").trim();

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.sanity.io",
      },
      // Ảnh cover project Behance (section "More on Behance" ở /work)
      {
        protocol: "https",
        hostname: "mir-s3-cdn-cf.behance.net",
        pathname: "/projects/**",
      },
      // Ảnh bìa bài Medium ở trang Writing (src/lib/medium.ts) — next/image
      // tải qua server nên không cần thêm vào img-src của CSP.
      { protocol: "https", hostname: "cdn-images-1.medium.com" },
      { protocol: "https", hostname: "miro.medium.com" },
    ],
  },
  // Slug cũ của bài viết → slug mới (đổi slug trong Sanity Studio cho khớp).
  // Giữ redirect này để link đã chia sẻ trước đó không bị 404.
  async redirects() {
    return [
      {
        source: "/blog/test-ux-article",
        destination: "/blog/ai-impact-on-translation-industry",
        permanent: true,
      },
      // Timeline đã gộp vào Toolkit thành 1 tab.
      {
        source: "/timeline",
        destination: "/tools/timeline",
        permanent: true,
      },
    ];
  },
  // MỚI: security headers cơ bản, áp dụng cho mọi route
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Chặn trình duyệt tự đoán loại file khác với Content-Type khai báo
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Hạn chế thông tin URL nguồn bị lộ khi người dùng click link ra ngoài
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Tắt truy cập camera/mic/vị trí — site này không cần dùng
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      // Mọi trang trừ /chill/embed: chặn clickjacking — không thể bị nhúng trong
      // iframe của domain khác. CSP giới hạn nguồn script/ảnh/style — chống XSS
      {
        source: "/:path((?!chill/embed$).*)",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Content-Security-Policy", value: csp("'self'") },
        ],
      },
      // /chill/embed: khung nhạc thu nhỏ để nhúng vào Notion, blog… nên cho phép mọi
      // site https đặt vào iframe. Trang này không có ô nhập liệu hay chuyển tiền nào
      {
        source: "/chill/embed",
        headers: [{ key: "Content-Security-Policy", value: csp("'self' https:") }],
      },
    ];
  },
};

export default nextConfig;
