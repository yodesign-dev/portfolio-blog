import type { Metadata } from "next";
import { Mulish, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";

// 1. Khởi tạo font Mulish (hỗ trợ Tiếng Việt) và gán vào biến --font-geist-sans để map trúng file globals.css cũ
const mulish = Mulish({
  variable: "--font-geist-sans",
  subsets: ["latin", "vietnamese"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "bin designer",
  description: "binvblogs",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="vi"
      className={`${mulish.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children} <Analytics /> </body>
    </html>
  );
}