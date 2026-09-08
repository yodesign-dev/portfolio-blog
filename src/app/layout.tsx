import type { Metadata } from "next";
import { Mulish, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { draftMode } from "next/headers";
import { VisualEditing } from "next-sanity/visual-editing";
import { Navbar } from "@/components/originkit/ui/hero-31/navbar";
import { ContactModalProvider } from "@/components/originkit/ui/hero-31/contact-modal-context";
import { ContactModal } from "@/components/originkit/ui/hero-31/contact-modal";
import { DisableDraftMode } from "@/components/DisableDraftMode";

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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // MỚI: kiểm tra Draft Mode để biết có đang xem preview từ Presentation
  // Tool hay không — chỉ hiện overlay click-to-edit khi đang preview,
  // người xem bình thường (đọc bản đã publish) không thấy gì khác.
  const isDraftMode = (await draftMode()).isEnabled;

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
        {isDraftMode && (
          <>
            <VisualEditing />
            <DisableDraftMode />
          </>
        )}
      </body>
    </html>
  );
}
