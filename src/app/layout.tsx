import type { Metadata } from "next";
import { Mulish, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { draftMode } from "next/headers";
import { VisualEditing } from "next-sanity/visual-editing";
import { SiteChrome } from "@/components/SiteChrome";
import { DisableDraftMode } from "@/components/DisableDraftMode";
import { client } from "@/sanity/lib/client";
import { SITE_NAME, SITE_ROLE } from "@/lib/site";

const mulish = Mulish({
  variable: "--font-geist-sans",
  subsets: ["latin", "vietnamese"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: `${SITE_NAME} — ${SITE_ROLE}`,
    template: `%s · ${SITE_NAME}`,
  },
  description:
    "Bin Nguyen is a product designer with 10+ years of end-to-end experience, using AI to move from research to high-fidelity work faster. Case studies, writing and toolkit.",
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
      className={`${mulish.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SiteChrome showResume={hasPublicResume}>{children}</SiteChrome>
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
