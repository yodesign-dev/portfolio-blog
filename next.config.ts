import type { NextConfig } from "next";

// Content-Security-Policy — whitelist cdn.sanity.io vì ảnh bài viết load từ Sanity CMS.
// Nếu sau này bạn gọi trực tiếp Sanity API từ client (client-side fetch), nhớ thêm
// domain API tương ứng (vd: https://<project-id>.api.sanity.io) vào connect-src.
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval';
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data: https://cdn.sanity.io;
  font-src 'self';
  connect-src 'self' https://*.api.sanity.io;
  frame-ancestors 'self';
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
    ],
  },
  // MỚI: security headers cơ bản, áp dụng cho mọi route
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Chặn clickjacking — trang không thể bị nhúng trong iframe
          // của domain khác
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          // Chặn trình duyệt tự đoán loại file khác với Content-Type khai báo
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Hạn chế thông tin URL nguồn bị lộ khi người dùng click link ra ngoài
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Tắt truy cập camera/mic/vị trí — site này không cần dùng
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          // Giới hạn nguồn script/ảnh/style được phép load — chống XSS
          { key: "Content-Security-Policy", value: cspHeader },
        ],
      },
    ];
  },
};

export default nextConfig;
