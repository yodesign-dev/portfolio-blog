import type { Metadata } from "next";
import { Mulish, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
// MỚI: Navbar + ContactModal giờ render ở đây — dùng chung cho MỌI
// trang (Home, Blog, Resume, Tools...), thay vì chỉ có trên trang chủ
// như trước. ContactModalProvider phải bọc quanh cả Navbar lẫn
// {children}, vì Navbar cần gọi useContactModal() để mở modal.
import { Navbar } from "@/components/originkit/ui/hero-31/navbar";
import { ContactModalProvider } from "@/components/originkit/ui/hero-31/contact-modal-context";
import { ContactModal } from "@/components/originkit/ui/hero-31/contact-modal";

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
      <body className="min-h-full flex flex-col">
        <ContactModalProvider>
          <Navbar />
          {children}
          <ContactModal />
        </ContactModalProvider>
        <Analytics />
      </body>
    </html>
  );
}
