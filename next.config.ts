import type { NextConfig } from "next";

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
        ],
      },
    ];
  },
};

export default nextConfig;
