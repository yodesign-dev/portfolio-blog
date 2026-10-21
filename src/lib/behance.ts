// Lấy danh sách project từ RSS công khai của Behance để hiện ở trang /work.
// Feed của Behance không phải XML chuẩn (có ký tự & trần), nên đọc bằng regex
// thay vì parser XML. Lỗi mạng / feed đổi định dạng → trả về [] để section tự ẩn.

import {SOCIAL_LINKS} from '@/lib/site'

export type BehanceProject = {
  title: string
  url: string
  cover: string | null
  year: string
}

// Chỉ hiện trên site các project Behance có nội dung đủ dày (đã đọc từng project
// ngày 2026-10-21). Bị ẩn: Allow contact list (1 flow ngắn), Authentication UX (1
// ảnh), TIKI.VN layout (1 ảnh), 6 bài #DailyUI (bài tập) — vẫn xem được trên
// Behance qua nút "View all on Behance". Thứ tự ở đây là thứ tự hiện trên site.
// id = mã số project trong link Behance (/gallery/<mã>/…). Feed chỉ có tên + ảnh
// bìa + năm, nên mô tả 1 dòng và tag viết tay theo nội dung từng project.
// (Dùng mảng, không dùng object: key dạng số của object bị JS tự xếp tăng dần.)
export const BEHANCE_SHOWCASE: {id: string; summary: string; tags: string[]}[] = [
  // Có My role, Results, User research, layout + flow đặt món tới checkout
  {
    id: '81566679',
    summary: 'Research, flows and UI for ordering on web and mobile — more completed orders, fewer cancellations.',
    tags: ['Web & mobile', 'Food delivery', 'User research'],
  },
  // Có Problem / Solution, user-flow và đủ các màn đăng ký tài xế
  {
    id: '81174743',
    summary: 'Drivers sign up and sign their contract in the app instead of at the office — a new user flow and UI.',
    tags: ['Mobile app', 'Logistics', 'User flow'],
  },
  // Trình diễn UI 6 tính năng, chưa có phần quá trình
  {
    id: '59297229',
    summary: 'iOS app for a social-consumer platform — share your lifestyle, join brand communities and claim rewards.',
    tags: ['iOS', 'Social', 'UI design'],
  },
]

const showcaseId = (url: string) => url.match(/\/gallery\/(\d+)/)?.[1] ?? ''
const showcaseIndex = (url: string) => BEHANCE_SHOWCASE.findIndex((p) => p.id === showcaseId(url))
export const showcaseNote = (url: string) => BEHANCE_SHOWCASE[showcaseIndex(url)]

export const BEHANCE_PROFILE = SOCIAL_LINKS.find((l) => l.label === 'Behance')?.href || 'https://www.behance.net/applebin'
const USERNAME = BEHANCE_PROFILE.replace(/\/+$/, '').split('/').pop()
const FEED_URL = `https://www.behance.net/feeds/user?username=${USERNAME}`

const tag = (name: string, xml: string) =>
  xml.match(new RegExp(`<${name}>\\s*(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?\\s*</${name}>`))?.[1]?.trim() ?? ''

const decode = (s: string) =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')

export async function getBehanceProjects(revalidate = 86400): Promise<BehanceProject[]> {
  try {
    const res = await fetch(FEED_URL, {next: {revalidate}, headers: {'User-Agent': 'Mozilla/5.0 (portfolio RSS reader)'}})
    if (!res.ok) return []
    const xml = await res.text()
    const projects = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)]
      .map(([, item]) => {
        const date = new Date(tag('pubDate', item))
        return {
          title: decode(tag('title', item)),
          url: tag('link', item),
          cover: tag('description', item).match(/<img[^>]+src=['"]([^'"]+)['"]/)?.[1] ?? null,
          year: Number.isNaN(date.getTime()) ? '' : String(date.getFullYear()),
        }
      })
      .filter((p) => p.title && p.url.startsWith('https://www.behance.net/') && showcaseIndex(p.url) >= 0)
      .sort((a, b) => showcaseIndex(a.url) - showcaseIndex(b.url))
    // Ảnh cover trong feed chỉ rộng 404px. CDN có bản 808px cho phần lớn project,
    // nhưng vài project cũ bị chuyển hướng sang dịch vụ render đang lỗi → kiểm
    // tra trước, không có thì giữ ảnh gốc (chỉ chạy khi cache hết hạn, ~1 lần/ngày)
    return Promise.all(projects.map(async (p) => ({...p, cover: p.cover ? await sharperCover(p.cover, revalidate) : null})))
  } catch {
    return []
  }
}

async function sharperCover(src: string, revalidate: number) {
  const big = src.replace('/projects/404/', '/projects/808/')
  if (big === src) return src
  try {
    // Cùng thời hạn cache với feed — không dùng no-store (sẽ biến /work thành trang dựng mỗi request)
    const res = await fetch(big, {method: 'HEAD', redirect: 'manual', next: {revalidate}})
    return res.status === 200 ? big : src
  } catch {
    return src
  }
}
