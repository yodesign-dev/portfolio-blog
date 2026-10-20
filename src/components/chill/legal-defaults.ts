// Nội dung mặc định của 2 trang /chill/terms và /chill/privacy.
//
// Dùng ở 2 chỗ:
// - Studio "Chill · Pháp lý": điền sẵn vào văn bản khi mở tài liệu lần đầu (initialValue)
// - Trang web: hiện bản này khi Studio chưa có tài liệu / ô văn bản đang trống
//
// {owner}, {email}, {updated} được thay bằng ô "Chủ sở hữu", "Email liên hệ",
// "Cập nhật lần cuối" trong Studio — sửa email một chỗ là cả 4 bản đổi theo.
//
// Bản quyền riêng tư viết theo đúng những gì code đang làm (xem các route
// src/app/api/chill-*). Đổi cách lưu dữ liệu thì nhớ sửa lại cả ở đây lẫn Studio.

export type LegalSection = {heading?: string; paragraphs?: string[]; bullets?: string[]}
export type LegalKind = 'terms' | 'privacy'

export const LEGAL_DEFAULTS: Record<LegalKind, {vi: LegalSection[]; en: LegalSection[]}> = {
  terms: {
    vi: [
      {
        paragraphs: [
          '/chill là một quán cà phê pixel miễn phí do {owner} làm. Khi vào quán, bạn đồng ý với những điều dưới đây.',
        ],
      },
      {
        heading: 'Bản quyền',
        paragraphs: [
          'Code, hình vẽ pixel, nhân vật, cảnh, chữ và tên gọi "/chill" thuộc về {owner}. Bạn được nghe, ngắm và dùng quán cho việc cá nhân.',
        ],
        bullets: [
          'Không sao chép, tải về để phân phối lại, bán lại hay làm trang khác dựa trên hình, nhạc hoặc code của quán.',
          'Không dùng nội dung của quán để huấn luyện mô hình AI.',
          'Muốn dùng vào việc khác (video, bài viết, sản phẩm), hãy hỏi trước qua {email}.',
        ],
      },
      {
        heading: 'Nhạc và hình làm bằng AI',
        paragraphs: [
          'Một phần nhạc và hình trong quán được tạo bằng công cụ AI rồi chỉnh sửa lại cho quán. Những phần này được cấp phép để dùng trong /chill, không được tải về để phân phối lại.',
        ],
      },
      {
        heading: 'Phần của bên thứ ba',
        bullets: [
          'Emoji động: Noto Emoji Animation của Google, giấy phép CC BY 4.0.',
          'Phông chữ, thư viện mã nguồn mở và dịch vụ hạ tầng dùng theo giấy phép riêng của từng bên.',
        ],
      },
      {
        heading: 'Nhúng quán vào trang khác',
        paragraphs: [
          'Bạn được nhúng trình phát nhỏ (/chill/embed) và dùng template Notion miễn phí, miễn là giữ nguyên link về applebin.me/chill và không sửa đổi rồi đóng gói lại.',
        ],
      },
      {
        heading: 'Nội dung bạn viết',
        paragraphs: [
          'Tin chat, mẩu nhật ký và góp ý wishlist là của bạn và do bạn chịu trách nhiệm. Khi gửi, bạn cho phép quán hiển thị chúng trong quán.',
        ],
        bullets: [
          'Không spam, quấy rối, nói lời thù ghét, đăng thông tin cá nhân của người khác hay nội dung trái pháp luật.',
          'Ai cũng có thể báo cáo một tin; đủ số lượt báo cáo thì tin tự ẩn.',
          '{owner} có thể ẩn hoặc xoá bất kỳ nội dung nào và chặn người vi phạm.',
        ],
      },
      {
        heading: 'Ủng hộ quán',
        paragraphs: [
          '"Mời Bin ly cà phê" là quà tặng tự nguyện, không phải mua dịch vụ nên không hoàn tiền. Tên và lời nhắn của bạn chỉ hiện trên bảng cảm ơn khi bạn đồng ý.',
        ],
      },
      {
        heading: 'Không bảo đảm',
        paragraphs: [
          'Quán là dự án cá nhân, có thể thay đổi, tạm đóng hoặc ngừng bất cứ lúc nào mà không báo trước. Quán được cung cấp "như hiện có", không bảo đảm luôn chạy hay không có lỗi.',
        ],
      },
      {
        heading: 'Báo vi phạm bản quyền',
        paragraphs: [
          'Nếu bạn thấy nội dung trong quán vi phạm bản quyền của mình, hoặc thấy quán bị sao chép ở nơi khác, hãy gửi email tới {email} kèm link và mô tả. Mình sẽ phản hồi sớm nhất có thể.',
        ],
      },
    ],
    en: [
      {
        paragraphs: ['/chill is a free pixel café made by {owner}. By stepping in, you agree to the terms below.'],
      },
      {
        heading: 'Copyright',
        paragraphs: [
          'The code, pixel art, characters, scenes, text and the "/chill" name belong to {owner}. You are welcome to listen, look around and use the café for personal use.',
        ],
        bullets: [
          'Do not copy, download for redistribution, resell or build another site from the café’s art, music or code.',
          'Do not use the café’s content to train AI models.',
          'For any other use (videos, articles, products), please ask first at {email}.',
        ],
      },
      {
        heading: 'AI-assisted music and art',
        paragraphs: [
          'Some music and art in the café were made with AI tools and then edited for the café. They are licensed for use in /chill only and may not be downloaded for redistribution.',
        ],
      },
      {
        heading: 'Third-party parts',
        bullets: [
          'Animated emoji: Google Noto Emoji Animation, CC BY 4.0.',
          'Fonts, open-source libraries and hosting services are used under their own licenses.',
        ],
      },
      {
        heading: 'Embedding the café',
        paragraphs: [
          'You may embed the mini player (/chill/embed) and use the free Notion templates, as long as the link back to applebin.me/chill stays and you do not modify and repackage them.',
        ],
      },
      {
        heading: 'What you write',
        paragraphs: [
          'Chat messages, diary notes and wishlist ideas are yours and your responsibility. By posting, you let the café show them inside the café.',
        ],
        bullets: [
          'No spam, harassment, hate, other people’s personal information or illegal content.',
          'Anyone can report a message; after enough reports it hides itself.',
          '{owner} may hide or delete any content and block people who break these rules.',
        ],
      },
      {
        heading: 'Supporting the café',
        paragraphs: [
          '"Buy Bin a coffee" is a voluntary gift, not a purchase, so it is not refundable. Your name and message only appear on the thank-you board if you agree.',
        ],
      },
      {
        heading: 'No warranty',
        paragraphs: [
          'The café is a personal project and may change, pause or close at any time without notice. It is provided "as is", without any guarantee that it will always work or be free of bugs.',
        ],
      },
      {
        heading: 'Reporting copyright issues',
        paragraphs: [
          'If you believe something in the café infringes your copyright, or you find the café copied elsewhere, email {email} with the link and a short description. I will reply as soon as I can.',
        ],
      },
    ],
  },
  privacy: {
    vi: [
      {
        paragraphs: [
          'Quán không bắt đăng ký tài khoản, không chạy quảng cáo, không bán dữ liệu và không dùng cookie theo dõi. Dưới đây là mọi thứ quán lưu và lưu bao lâu.',
        ],
      },
      {
        heading: 'Lưu trên máy bạn',
        paragraphs: [
          'Cài đặt (nhạc, cảnh, âm lượng, ngôn ngữ), chuỗi ngày ghé quán, danh sách việc cần làm, kệ sưu tầm, ly cà phê đã chọn, mẩu nhật ký "cất vào sổ" và các gợi ý đã xem nằm trong bộ nhớ trình duyệt của bạn (localStorage). Chúng không được gửi về máy chủ. Xoá dữ liệu trang web trong trình duyệt là mất hết.',
        ],
      },
      {
        heading: 'Lưu trên máy chủ',
        bullets: [
          'Phòng chat: tên hiển thị, màu, tin nhắn và cảm xúc. Tự xoá sau 24 giờ.',
          'Bàn nhóm: tên, nhân vật và trạng thái của bạn ở bàn. Tự xoá sau 7 ngày không ai dùng.',
          'Cả quán cùng pha phin: số phin bạn đã góp trong mùa và tên hiển thị của bạn (tên ngẫu nhiên quán tạo sẵn hoặc tên bạn tự đặt), hiện công khai trên bảng góp phin. Gắn với một mã ngẫu nhiên của máy, không phải tài khoản. Xoá khi mùa đó được dọn.',
          'Bảng nhật ký: tên, nội dung và tâm trạng của mẩu giấy. Tự xoá sau 7 ngày.',
          'Wishlist: góp ý, tên và email nếu bạn điền (chỉ để báo bạn khi góp ý được làm). Giữ đến khi góp ý được xoá. Lượt tim giữ 1 năm.',
          'Ủng hộ quán: tên, lời nhắn, số tiền, cách chuyển và mã đối chiếu, để khớp với sao kê và cảm ơn bạn. Số tiền và mã không bao giờ hiện công khai. Giữ đến khi bạn yêu cầu xoá.',
        ],
      },
      {
        heading: 'Địa chỉ IP',
        paragraphs: [
          'Để chống spam, máy chủ chỉ lưu IP ở dạng đã băm một chiều (không đọc ngược lại được), dùng để giới hạn số lần gửi. Quán không lưu IP thật.',
        ],
      },
      {
        heading: 'Dịch vụ bên ngoài',
        bullets: [
          'Vercel: chạy trang web và đếm lượt xem ẩn danh (Vercel Analytics, không dùng cookie).',
          'Upstash Redis: lưu chat, bàn nhóm và bộ đếm chống spam.',
          'Sanity: lưu nhạc, nhật ký, wishlist và thông tin ủng hộ.',
          'Cloudflare Turnstile: kiểm tra bạn không phải bot khi gửi tin đầu tiên hoặc viết nhật ký.',
          'Resend: gửi email báo cho {owner} khi có người ủng hộ, và báo bạn khi góp ý được làm.',
        ],
      },
      {
        heading: 'Quyền của bạn',
        paragraphs: [
          'Muốn xem, sửa hoặc xoá dữ liệu của mình, hãy gửi email tới {email}. Hầu hết dữ liệu tự xoá theo thời hạn ở trên mà không cần bạn làm gì.',
        ],
      },
      {
        heading: 'Thay đổi',
        paragraphs: ['Khi quán đổi cách lưu dữ liệu, trang này sẽ được cập nhật và ghi ngày ở đầu trang.'],
      },
    ],
    en: [
      {
        paragraphs: [
          'The café needs no account, runs no ads, sells no data and uses no tracking cookies. Here is everything it keeps and for how long.',
        ],
      },
      {
        heading: 'Stored on your device',
        paragraphs: [
          'Your settings (music, scene, volume, language), visit streak, to-do list, shelf collection, chosen coffee, diary notes you keep to yourself and the hints you have seen live in your browser storage (localStorage). They are never sent to the server. Clearing site data in your browser removes them.',
        ],
      },
      {
        heading: 'Stored on the server',
        bullets: [
          'Chat: display name, colour, messages and reactions. Deleted after 24 hours.',
          'Group table: your name, character and status at the table. Deleted after 7 days of no use.',
          'Whole café brewing: how many phins you added this season and your display name (the random name the café gave you, or one you chose), shown publicly on the phin board. Tied to a random device code, not an account. Removed when that season is cleared.',
          'Diary wall: the name, text and mood of each note. Deleted after 7 days.',
          'Wishlist: your idea, name and email if you add one (only to tell you when it ships). Kept until the idea is removed. Hearts are kept for 1 year.',
          'Support: name, message, amount, method and a matching code, to match bank statements and thank you. The amount and code are never shown publicly. Kept until you ask for deletion.',
        ],
      },
      {
        heading: 'IP addresses',
        paragraphs: [
          'To fight spam, the server only keeps a one-way hash of your IP (it cannot be turned back into the address), used for rate limits. Your real IP is not stored.',
        ],
      },
      {
        heading: 'Outside services',
        bullets: [
          'Vercel: hosts the site and counts anonymous page views (Vercel Analytics, no cookies).',
          'Upstash Redis: stores chat, group tables and anti-spam counters.',
          'Sanity: stores music, diary notes, wishlist ideas and support records.',
          'Cloudflare Turnstile: checks you are not a bot when you send your first message or write a diary note.',
          'Resend: emails {owner} when someone supports the café, and emails you when your idea ships.',
        ],
      },
      {
        heading: 'Your rights',
        paragraphs: [
          'To see, correct or delete your data, email {email}. Most data deletes itself on the schedule above without you doing anything.',
        ],
      },
      {
        heading: 'Changes',
        paragraphs: ['If the café changes how it stores data, this page will be updated and dated at the top.'],
      },
    ],
  },
}

// Portable Text tối giản (h2, đoạn văn, gạch đầu dòng) — đúng định dạng ô văn bản trong Studio
export type LegalBlock = {
  _type: 'block'
  _key: string
  style: 'normal' | 'h2'
  listItem?: 'bullet'
  level?: number
  markDefs: []
  children: {_type: 'span'; _key: string; text: string; marks: string[]}[]
}

export function toBlocks(sections: LegalSection[]): LegalBlock[] {
  const blocks: LegalBlock[] = []
  const add = (text: string, style: 'normal' | 'h2', bullet = false) => {
    const key = `b${blocks.length}`
    blocks.push({
      _type: 'block',
      _key: key,
      style,
      ...(bullet ? {listItem: 'bullet' as const, level: 1} : {}),
      markDefs: [],
      children: [{_type: 'span', _key: `${key}s`, text, marks: []}],
    })
  }
  for (const s of sections) {
    if (s.heading) add(s.heading, 'h2')
    s.paragraphs?.forEach((p) => add(p, 'normal'))
    s.bullets?.forEach((b) => add(b, 'normal', true))
  }
  return blocks
}
