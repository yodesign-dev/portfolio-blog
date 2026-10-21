// scripts/import-medium.mjs
//
// Import bài viết từ Medium export (folder posts/) vào Sanity, tạo thành
// DRAFT (chưa publish) để bạn tự kiểm tra lại trước khi bấm Publish.
//
// CÀI ĐẶT (chạy 1 lần):
//   npm install cheerio @sanity/client
//
// BIẾN MÔI TRƯỜNG cần có (đặt trong .env.local hoặc export trực tiếp
// trong terminal trước khi chạy — token này CẦN quyền Editor, không
// dùng chung với token Viewer đã tạo cho Presentation Tool):
//   SANITY_PROJECT_ID=9os2xcca
//   SANITY_DATASET=production
//   SANITY_API_WRITE_TOKEN=...
//
// CHẠY:
//   node scripts/import-medium.mjs ./medium-export/posts

import fs from 'node:fs/promises'
import path from 'node:path'
import {createClient} from '@sanity/client'
import * as cheerio from 'cheerio'

const PROJECT_ID = process.env.SANITY_PROJECT_ID || process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const DATASET =
  process.env.SANITY_DATASET || process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'
const TOKEN = process.env.SANITY_API_WRITE_TOKEN

if (!PROJECT_ID || !TOKEN) {
  console.error('Thiếu SANITY_PROJECT_ID hoặc SANITY_API_WRITE_TOKEN trong biến môi trường.')
  process.exit(1)
}

const client = createClient({
  projectId: PROJECT_ID,
  dataset: DATASET,
  apiVersion: '2024-01-01',
  token: TOKEN,
  useCdn: false,
})

const postsDir = process.argv[2]
if (!postsDir) {
  console.error('Dùng: node scripts/import-medium.mjs <đường-dẫn-folder-posts>')
  process.exit(1)
}

function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // bỏ dấu tiếng Việt nếu có
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 90)
}

function newKey() {
  return Math.random().toString(36).slice(2, 10)
}

// Chuyển 1 node <p>/<h3>/<li> (chứa text + <strong>/<em>/<a> lồng nhau)
// thành mảng "children" (spans) + "markDefs" (annotation cho link) theo
// đúng chuẩn Portable Text.
function inlineToSpans($, node) {
  const children = []
  const markDefs = []

  function walk(el, activeMarks) {
    const $el = $(el)
    if (el.type === 'text') {
      const text = $el.text()
      if (text) children.push({_type: 'span', _key: newKey(), text, marks: [...activeMarks]})
      return
    }
    if (el.type !== 'tag') return

    let marks = activeMarks
    if (el.name === 'strong' || el.name === 'b') marks = [...marks, 'strong']
    else if (el.name === 'em' || el.name === 'i') marks = [...marks, 'em']
    else if (el.name === 'a') {
      const key = newKey()
      markDefs.push({_type: 'link', _key: key, href: $el.attr('href') || ''})
      marks = [...marks, key]
    }

    $el.contents().each((_, child) => walk(child, marks))
  }

  $(node)
    .contents()
    .each((_, child) => walk(child, []))

  return {children, markDefs}
}

function textBlock($, node, style = 'normal', listItem) {
  const {children, markDefs} = inlineToSpans($, node)
  if (children.length === 0) return null
  return {
    _type: 'block',
    _key: newKey(),
    style,
    markDefs,
    children,
    ...(listItem ? {listItem, level: 1} : {}),
  }
}

async function uploadImage(url) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        Accept: 'image/*,*/*;q=0.8',
      },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const buffer = Buffer.from(await res.arrayBuffer())
    const filename = url.split('/').pop()?.split('?')[0] || 'image.jpg'
    const asset = await client.assets.upload('image', buffer, {filename})
    return asset._id
  } catch (err) {
    // err.cause thường chứa lý do thật (ENOTFOUND, certificate error,
    // ECONNRESET...) — "fetch failed" một mình không đủ để biết vì sao.
    console.warn(`  ⚠️  Không tải được ảnh ${url}:`, err.message, err.cause || '')
    return null
  }
}

async function convertBody($, root) {
  const blocks = []
  // .section-inner là nơi chứa nội dung thật; bỏ qua <hr class="section-divider">
  // ở ngoài cùng vì đó chỉ là khung bọc kỹ thuật của Medium, không phải
  // divider người dùng chủ động chèn.
  const nodes = $(root).find('.section-inner').first().children().toArray()

  for (const node of nodes) {
    const $node = $(node)
    const tag = node.name

    if (tag === 'h1' || tag === 'h2' || tag === 'h3') {
      const block = textBlock($, node, tag)
      if (block) blocks.push(block)
    } else if (tag === 'p') {
      const block = textBlock($, node)
      if (block) blocks.push(block)
    } else if (tag === 'blockquote') {
      const block = textBlock($, node, 'blockquote')
      if (block) blocks.push(block)
    } else if (tag === 'ul' || tag === 'ol') {
      const listItem = tag === 'ul' ? 'bullet' : 'number'
      $node.children('li').each((_, li) => {
        const block = textBlock($, li, 'normal', listItem)
        if (block) blocks.push(block)
      })
    } else if (tag === 'figure') {
      const img = $node.find('img').first()
      const src = img.attr('src')
      if (src) {
        console.log(`  → đang tải ảnh: ${src}`)
        const assetId = await uploadImage(src)
        if (assetId) {
          const caption = $node.find('figcaption').text().trim()
          blocks.push({
            _type: 'image',
            _key: newKey(),
            asset: {_type: 'reference', _ref: assetId},
            alt: caption || '',
            ...(caption ? {caption} : {}),
          })
        }
      }
    } else if (tag === 'hr') {
      // <hr> nằm GIỮA nội dung (không phải divider bọc ngoài) → chuyển
      // thành block "divider" thật.
      blocks.push({_type: 'divider', _key: newKey(), style: 'line'})
    }
    // Bỏ qua các tag khác (div bọc, script...) không cần chuyển đổi.
  }

  return blocks
}

async function importFile(filePath) {
  const html = await fs.readFile(filePath, 'utf-8')
  const $ = cheerio.load(html)

  const title = $('h1.p-name').first().text().trim()
  if (!title) {
    console.log(`⏭️  Bỏ qua (không tìm thấy tiêu đề): ${path.basename(filePath)}`)
    return
  }

  const subtitle = $('section[data-field="subtitle"]').first().text().trim()
  const excerpt = subtitle ? subtitle.slice(0, 200) : undefined
  const publishedAt = $('footer time').attr('datetime') || new Date().toISOString()
  const bodyRoot = $('section[data-field="body"]').first()

  console.log(`\n📄 Đang xử lý: ${title}`)
  const body = await convertBody($, bodyRoot)

  const doc = {
    _id: `drafts.medium-import-${slugify(title)}`,
    _type: 'post',
    title,
    slug: {_type: 'slug', current: slugify(title)},
    publishedAt,
    author: 'Applebin',
    ...(excerpt ? {excerpt} : {}),
    body,
  }

  await client.createOrReplace(doc)
  console.log(`  ✅ Đã tạo draft: "${title}" (${body.length} block)`)
}

async function main() {
  const files = (await fs.readdir(postsDir)).filter((f) => f.endsWith('.html'))
  console.log(`Tìm thấy ${files.length} file .html trong ${postsDir}`)

  for (const file of files) {
    try {
      await importFile(path.join(postsDir, file))
    } catch (err) {
      console.error(`❌ Lỗi khi xử lý ${file}:`, err.message)
    }
  }

  console.log('\n🎉 Xong! Vào Sanity Studio → Bài viết → lọc "Draft" để kiểm tra và Publish từng bài.')
}

main()
