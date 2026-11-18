import type { Metadata } from "next";
import { Archivo, Mulish, Geist_Mono, Space_Mono } from "next/font/google";
import "./globals.css";
import { SiteAnalytics } from "@/components/SiteAnalytics";
import { draftMode } from "next/headers";
import { VisualEditing } from "next-sanity/visual-editing";
import { SiteChrome } from "@/components/SiteChrome";
import { DisableDraftMode } from "@/components/DisableDraftMode";
import { client } from "@/sanity/lib/client";
import { SITE_DESCRIPTION, SITE_NAME, SITE_ROLE, SITE_URL, ogImageUrl } from "@/lib/site";

const mulish = Mulish({
  variable: "--font-mulish",
  subsets: ["latin", "vietnamese"],
});

// Mulish + Geist Mono: /chill và Studio. Archivo + Space Mono: portfolio (khối
// [data-skin="paper"] trong globals.css gán chúng vào font-sans / font-mono).
// Archivo là variable font nên không khai weight: dùng được mọi độ đậm 100–900.
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin", "vietnamese"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Nhãn, nút, menu của portfolio. `subsets` là danh sách subset được PRELOAD, không phải danh sách
// được hỗ trợ: chỉ preload latin (2 file, 400 và 700) để nút và nhãn ở màn đầu không nháy font
// dự phòng. Chữ tiếng Việt vẫn hiện đúng: file vietnamese tải khi trang có ký tự cần tới nó.
// Cái giá: font khai ở layout gốc nên /chill cũng preload 2 file này dù không dùng.
const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — ${SITE_ROLE}`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: `${SITE_NAME} — ${SITE_ROLE}`,
    description: SITE_DESCRIPTION,
    url: "/",
    images: [{ url: ogImageUrl(), width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image", images: [ogImageUrl()] },
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

  // Chỉ hiện "Resume" trên menu khi resume đã bật Công khai + có file —
  // tránh dẫn người xem (nhất là recruiter) tới một trang trống.
  const hasPublicResume = await client
    .fetch<boolean>(
      `defined(*[_type == "resume" && isPublic == true && defined(file.asset)][0]._id)`,
      {},
      { next: { revalidate: 60 } }
    )
    .catch(() => false);

  return (
    <html
      lang="en"
      className={`${mulish.variable} ${archivo.variable} ${geistMono.variable} ${spaceMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SiteChrome showResume={hasPublicResume}>{children}</SiteChrome>
        <SiteAnalytics />
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
