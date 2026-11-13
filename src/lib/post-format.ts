// Định dạng dùng chung cho trang danh sách Writing (/blog) và trang chi tiết
// bài (PostArticle) — trước đây mỗi nơi tự viết một bản.

// Dưới ngưỡng này thì không hiện số lượt xem: bài mới ghi "0 views" / "3 views"
// là bằng chứng xã hội ngược, làm bài trông như không ai đọc.
export const VIEW_COUNT_MIN = 50

export function formatViews(count: number | undefined, suffix: string): string | null {
  const value = count ?? 0
  if (value < VIEW_COUNT_MIN) return null
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k ${suffix}`
  return `${value} ${suffix}`
}

// Mục lục: id đọc được cho tiêu đề ("the-trade-off"), bỏ dấu tiếng Việt
// (NFD tách dấu khỏi chữ, "đ" không tách được nên đổi tay).
export function slugifyHeading(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

type PortableBlock = {
  _key?: string
  _type?: string
  style?: string
  children?: {text?: string}[]
}

export type TocItem = {id: string; text: string}

// Lấy các tiêu đề cấp mục (H1 và H2 trong thân bài — H1 trong thân bài được vẽ
// thành <h2>, xem PostArticle) để làm mục lục. Trả kèm map _key → id để
// renderer gắn đúng id vào từng tiêu đề, kể cả khi 2 tiêu đề trùng chữ.
export function buildToc(body: unknown): {items: TocItem[]; idByKey: Map<string, string>} {
  const items: TocItem[] = []
  const idByKey = new Map<string, string>()
  if (!Array.isArray(body)) return {items, idByKey}

  const used = new Set<string>()
  for (const block of body as PortableBlock[]) {
    if (block?._type !== 'block' || (block.style !== 'h1' && block.style !== 'h2')) continue
    const text = (block.children ?? []).map((c) => c.text ?? '').join('').trim()
    if (!text || !block._key) continue

    const base = slugifyHeading(text) || 'section'
    let id = base
    for (let n = 2; used.has(id); n++) id = `${base}-${n}`
    used.add(id)

    items.push({id, text})
    idByKey.set(block._key, id)
  }
  return {items, idByKey}
}
