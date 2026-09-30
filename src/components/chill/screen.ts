// Màn hình laptop trang /chill: một app thiết kế thu nhỏ đang được dùng —
// con trỏ kéo khung, gõ chữ, đổi màu nút, kéo nút sang chỗ khác… xong 1 màn
// thì "xuất" rồi bắt đầu màn mới.
//
// Vẽ theo px thật trên canvas đệm 640×360 (ctx không scale), nằm dưới lớp người
// ngồi — vùng màn hình trong sheet đã khoét trong suốt, đầu/vai vẫn che phía trước.
// Phần bên phải bị đầu che nên bố cục dồn sang trái.

export const SCREEN = {x: 436, y: 219, w: 88, h: 49}

type Rect = {x: number; y: number; w: number; h: number}
type El = Rect & {color: string; kind: 'rect' | 'text' | 'round'}

type Step =
  | {op: 'draw'; el: El} // kéo chuột vẽ khung
  | {op: 'type'; el: El} // gõ chữ: thanh chữ dài dần
  | {op: 'color'; target: number; color: string} // bấm ô màu → đổi màu phần tử
  | {op: 'move'; target: number; dx: number; dy: number} // kéo phần tử đi chỗ khác

const INK = '#2b2b33'
const GREY = '#a3a3ad'

// Mỗi màn: artboard (toạ độ trong khung canvas của app) + các bước
const DESIGNS: {board: Rect; steps: Step[]}[] = [
  {
    // Thẻ bài viết trên điện thoại
    board: {x: 10, y: 3, w: 26, h: 38},
    steps: [
      {op: 'draw', el: {kind: 'rect', x: 2, y: 2, w: 22, h: 12, color: '#f2a65a'}},
      {op: 'type', el: {kind: 'text', x: 2, y: 16, w: 17, h: 2, color: INK}},
      {op: 'type', el: {kind: 'text', x: 2, y: 20, w: 21, h: 1, color: GREY}},
      {op: 'type', el: {kind: 'text', x: 2, y: 22, w: 14, h: 1, color: GREY}},
      {op: 'draw', el: {kind: 'round', x: 2, y: 30, w: 12, h: 5, color: '#5b6cff'}},
      {op: 'color', target: 4, color: '#e0567a'},
      {op: 'move', target: 4, dx: 10, dy: 0},
    ],
  },
  {
    // Trang đích: hero + 3 thẻ tính năng
    board: {x: 4, y: 4, w: 40, h: 34},
    steps: [
      {op: 'type', el: {kind: 'text', x: 3, y: 4, w: 20, h: 3, color: INK}},
      {op: 'type', el: {kind: 'text', x: 3, y: 9, w: 26, h: 1, color: GREY}},
      {op: 'draw', el: {kind: 'round', x: 3, y: 13, w: 10, h: 4, color: '#1f9d6b'}},
      {op: 'draw', el: {kind: 'rect', x: 3, y: 21, w: 10, h: 10, color: '#f4d06f'}},
      {op: 'draw', el: {kind: 'rect', x: 15, y: 21, w: 10, h: 10, color: '#8ecae6'}},
      {op: 'draw', el: {kind: 'rect', x: 27, y: 21, w: 10, h: 10, color: '#f7a8b8'}},
      {op: 'color', target: 2, color: '#ff7a45'},
    ],
  },
  {
    // Bảng điều khiển: biểu đồ cột
    board: {x: 6, y: 3, w: 36, h: 36},
    steps: [
      {op: 'type', el: {kind: 'text', x: 3, y: 3, w: 14, h: 2, color: INK}},
      {op: 'draw', el: {kind: 'rect', x: 4, y: 20, w: 4, h: 12, color: '#5b6cff'}},
      {op: 'draw', el: {kind: 'rect', x: 11, y: 14, w: 4, h: 18, color: '#5b6cff'}},
      {op: 'draw', el: {kind: 'rect', x: 18, y: 24, w: 4, h: 8, color: '#5b6cff'}},
      {op: 'draw', el: {kind: 'rect', x: 25, y: 10, w: 4, h: 22, color: '#5b6cff'}},
      {op: 'color', target: 4, color: '#f2a65a'},
      {op: 'move', target: 3, dx: 0, dy: -6},
    ],
  },
]

const SWATCHES = ['#5b6cff', '#e0567a', '#ff7a45', '#f2a65a', '#1f9d6b']
// Khung canvas của app (trong màn hình): chừa panel trái 16px, thanh trên 4px
const CANVAS = {x: 16, y: 4, w: 56, h: 45}
const STEP_TIME = 2.2
const HOLD = 2.5

const ease = (k: number) => (k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2)
const clamp01 = (k: number) => Math.max(0, Math.min(1, k))
const lerp = (a: number, b: number, k: number) => a + (b - a) * k

export function drawScreen(ctx: CanvasRenderingContext2D, t: number, night: boolean) {
  const S = SCREEN
  const cycle = DESIGNS.map((d) => d.steps.length * STEP_TIME + HOLD)
  const total = cycle.reduce((a, b) => a + b, 0)
  let local = t % total
  let di = 0
  while (local >= cycle[di]) local -= cycle[di++]
  const design = DESIGNS[di]
  const board = {x: S.x + CANVAS.x + design.board.x, y: S.y + CANVAS.y + design.board.y, w: design.board.w, h: design.board.h}

  // Dựng trạng thái tới thời điểm hiện tại
  const els: El[] = []
  let active = -1
  let cursor = {x: S.x + 40, y: S.y + 30}
  let press = false
  let typing: El | null = null
  const stepIndex = Math.floor(local / STEP_TIME)
  for (let i = 0; i < design.steps.length && i <= stepIndex; i++) {
    const step = design.steps[i]
    const k = i < stepIndex ? 1 : (local - i * STEP_TIME) / STEP_TIME
    const reach = ease(clamp01(k / 0.35)) // 35% đầu: đưa chuột tới chỗ
    const act = clamp01((k - 0.35) / 0.5) // 50% tiếp: thao tác
    const abs = (el: Rect) => ({x: board.x + el.x, y: board.y + el.y})
    if (step.op === 'draw' || step.op === 'type') {
      const el = {...step.el}
      const p = abs(el)
      if (act > 0) {
        const grow = ease(act)
        els.push({...el, w: Math.max(1, Math.round(el.w * grow)), h: step.op === 'draw' ? Math.max(1, Math.round(el.h * grow)) : el.h})
        active = els.length - 1
        if (step.op === 'type' && act < 1) typing = els[active]
      }
      const from = cursor
      const start = {x: p.x, y: p.y}
      const end = step.op === 'draw' ? {x: p.x + el.w, y: p.y + el.h} : {x: p.x + el.w + 2, y: p.y + el.h + 3}
      cursor = act > 0 ? {x: lerp(start.x, end.x, ease(act)), y: lerp(start.y, end.y, ease(act))} : {x: lerp(from.x, start.x, reach), y: lerp(from.y, start.y, reach)}
      press = step.op === 'draw' && act > 0 && act < 1
    } else if (step.op === 'color') {
      const el = els[step.target]
      if (!el) continue
      active = step.target
      const sw = SWATCHES.indexOf(step.color)
      const swatch = {x: S.x + 3 + Math.max(0, sw) * 2.5, y: S.y + S.h - 5}
      cursor = k < 0.5 ? {x: lerp(cursor.x, swatch.x, ease(clamp01(k / 0.4))), y: lerp(cursor.y, swatch.y, ease(clamp01(k / 0.4)))} : swatch
      press = k > 0.42 && k < 0.5
      if (k >= 0.5) el.color = step.color
    } else {
      const el = els[step.target]
      if (!el) continue
      active = step.target
      const p = abs(el)
      const grab = {x: p.x + el.w / 2, y: p.y + el.h / 2}
      const m = ease(act)
      if (act <= 0) cursor = {x: lerp(cursor.x, grab.x, reach), y: lerp(cursor.y, grab.y, reach)}
      else {
        el.x += step.dx * m
        el.y += step.dy * m
        cursor = {x: grab.x + step.dx * m, y: grab.y + step.dy * m}
        press = act < 1
      }
    }
  }
  const holding = stepIndex >= design.steps.length
  if (holding) active = -1

  ctx.save()
  ctx.beginPath()
  ctx.rect(S.x, S.y, S.w, S.h)
  ctx.clip()
  // Khung app
  ctx.fillStyle = '#1d1d22'
  ctx.fillRect(S.x, S.y, S.w, S.h)
  ctx.fillStyle = '#3a3a42'
  ctx.fillRect(S.x + CANVAS.x, S.y + CANVAS.y, CANVAS.w, CANVAS.h)
  ctx.fillStyle = '#2a2a30'
  ctx.fillRect(S.x, S.y, S.w, 4)
  for (const [i, c] of ['#ff5f57', '#febc2e', '#28c840'].entries()) {
    ctx.fillStyle = c
    ctx.fillRect(S.x + 2 + i * 3, S.y + 1, 2, 2)
  }
  ctx.fillStyle = '#5a5a66'
  ctx.fillRect(S.x + 30, S.y + 1, 22, 2)

  // Panel layers: mỗi phần tử 1 dòng, dòng đang chọn tô xanh
  ctx.fillStyle = '#6d6d78'
  ctx.fillRect(S.x + 2, S.y + 6, 9, 1)
  els.forEach((el, i) => {
    const y = S.y + 9 + i * 4
    if (i === active) {
      ctx.fillStyle = '#2f4c8a'
      ctx.fillRect(S.x, y - 1, CANVAS.x, 3)
    }
    ctx.fillStyle = el.color
    ctx.fillRect(S.x + 2, y, 2, 1)
    ctx.fillStyle = i === active ? '#dfe6ff' : '#8a8a96'
    ctx.fillRect(S.x + 5, y, el.kind === 'text' ? 8 : 6, 1)
  })
  // Ô màu dưới panel
  SWATCHES.forEach((c, i) => {
    ctx.fillStyle = c
    ctx.fillRect(S.x + 2 + i * 2.5, S.y + S.h - 6, 2, 2)
  })

  // Artboard + phần tử
  ctx.fillStyle = '#fbfaf7'
  ctx.fillRect(board.x, board.y, board.w, board.h)
  for (const el of els) {
    const x = Math.round(board.x + el.x)
    const y = Math.round(board.y + el.y)
    ctx.fillStyle = el.color
    if (el.kind === 'round' && el.w > 2 && el.h > 2) {
      ctx.fillRect(x + 1, y, el.w - 2, el.h)
      ctx.fillRect(x, y + 1, el.w, el.h - 2)
    } else ctx.fillRect(x, y, el.w, el.h)
  }
  // Con trỏ nhấp nháy khi đang gõ
  if (typing && Math.floor(t * 3) % 2) {
    ctx.fillStyle = '#3d6df2'
    ctx.fillRect(Math.round(board.x + typing.x + typing.w + 1), Math.round(board.y + typing.y - 1), 1, typing.h + 2)
  }
  // Khung chọn + 4 tay nắm
  const sel = els[active]
  if (sel) {
    const x = Math.round(board.x + sel.x) - 1
    const y = Math.round(board.y + sel.y) - 1
    const w = sel.w + 2
    const h = sel.h + 2
    ctx.strokeStyle = '#4f8cff'
    ctx.lineWidth = 1
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1)
    ctx.fillStyle = '#ffffff'
    for (const [hx, hy] of [
      [x, y],
      [x + w - 1, y],
      [x, y + h - 1],
      [x + w - 1, y + h - 1],
    ])
      ctx.fillRect(hx, hy, 1, 1)
  }
  // Chớp trắng lúc "xuất" màn xong
  if (holding) {
    const k = (local - design.steps.length * STEP_TIME) / HOLD
    if (k > 0.85) {
      ctx.fillStyle = `rgba(255,255,255,${((k - 0.85) / 0.15) * 0.6})`
      ctx.fillRect(board.x, board.y, board.w, board.h)
    }
  }
  drawPointer(ctx, Math.round(cursor.x), Math.round(cursor.y), press)
  // Ban ngày màn hình bị nắng làm bạc đi một chút
  if (!night) {
    ctx.fillStyle = 'rgba(210,220,235,0.1)'
    ctx.fillRect(S.x, S.y, S.w, S.h)
  }
  ctx.restore()
}

// Mũi tên chuột 4×6, viền tối; đang nhấn thì co lại 1px
function drawPointer(ctx: CanvasRenderingContext2D, x: number, y: number, press: boolean) {
  const shape = ['1', '11', '121', '1221', '1222', '11', '01']
  shape.forEach((row, j) => {
    if (press && j === shape.length - 1) return
    for (let i = 0; i < row.length; i++) {
      if (row[i] === '0') continue
      ctx.fillStyle = row[i] === '1' ? '#101014' : '#ffffff'
      ctx.fillRect(x + i, y + j, 1, 1)
    }
  })
}
