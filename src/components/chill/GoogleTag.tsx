import Script from 'next/script'

// Google tag (gtag.js) của tài khoản Google Ads — chỉ gắn ở trang /chill (đo chuyển đổi quảng cáo
// đưa khách vào quán). Domain Google đã mở trong CSP (next.config.ts).
//
// Đoạn khởi tạo dataLayer là <script> thường, render sẵn trong HTML từ server nên chạy ngay khi
// trang tải (next/script inline afterInteractive có lúc không chạy lại khi tải lại trang ở bản dev);
// thư viện gtag.js tải sau, đọc hàng đợi dataLayer đã có sẵn.
const GOOGLE_TAG_ID = 'AW-18522775547'

export function GoogleTag() {
  return (
    <>
      <script
        id="google-tag"
        dangerouslySetInnerHTML={{
          __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GOOGLE_TAG_ID}');`,
        }}
      />
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_TAG_ID}`} strategy="afterInteractive" />
    </>
  )
}
