// Quán gọn (Studio "compactOpen"): khách tự chọn thứ gì hiện trên màn hình. Lưu trên máy khách,
// không tài khoản. Mỗi nhóm nhớ riêng khách đã tự bấm chưa (`touched`): nhóm khách đã bấm thì
// quán không bao giờ tự bật / tắt lại; nhóm chưa bấm thì quán tự mở khi tới lúc (xem `autoOpen`).
//
// Nhóm:
//  shelf  — kệ sưu tầm + mèo đi chơi xa (hai thứ gắn với nhau trong code: trip cần kệ)
//  diary  — nút Nhật ký + mẩu giấy của mèo ở góc trái
//  table  — nút Mời bạn ngồi cùng + nút trò chuyện
//  hints  — lấp lánh trên vật trong cảnh, vòng sáng nút mới, và 3 lời mời làm quen mỗi lần ghé
//           (tắt: còn 1 lời mời mỗi lần ghé)

export const LAYOUT_GROUPS = ['shelf', 'diary', 'table', 'hints'] as const
export type LayoutGroup = (typeof LAYOUT_GROUPS)[number]
export type Layout = Record<LayoutGroup, boolean>
export type LayoutState = {on: Layout; touched: LayoutGroup[]}

const KEY = 'chill:layout'

// Khách mới hoàn toàn: kệ để sẵn (chưa pha phin thì kệ trống, không có gì trên bậu cửa), còn
// lại cất hết
export const LAYOUT_NEW: Layout = {shelf: true, diary: false, table: false, hints: false}
export const LAYOUT_ALL: Layout = {shelf: true, diary: true, table: true, hints: true}
export const LAYOUT_MIN: Layout = {shelf: false, diary: false, table: false, hints: false}

const has = (key: string) => {
  try {
    return localStorage.getItem(key) !== null
  } catch {
    return false
  }
}

// Khách đã ghé từ trước khi có quán gọn (dấu vết trên máy) → giữ thứ họ đang dùng
function inferLayout(): Layout {
  let diaryUsed = false
  try {
    const d = JSON.parse(localStorage.getItem('chill:diary') ?? 'null') as {mine?: unknown[]} | null
    diaryUsed = Array.isArray(d?.mine) && d.mine.length > 0
  } catch {
    // dữ liệu hỏng → coi như chưa viết
  }
  return {
    shelf: true,
    diary: diaryUsed || has('chill:diary-pick'),
    // chill:table-me là định danh chung (identity.ts), máy nào cũng có → chỉ tính đã ngồi bàn
    table: has('chill:table-id'),
    hints: false,
  }
}

export function loadLayout(): LayoutState {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<{on: Partial<Layout>; touched: unknown[]}> | null
    if (raw && raw.on && typeof raw.on === 'object') {
      const base = inferLayout()
      const on = {...base}
      for (const g of LAYOUT_GROUPS) if (typeof raw.on[g] === 'boolean') on[g] = raw.on[g] as boolean
      const touched = Array.isArray(raw.touched) ? LAYOUT_GROUPS.filter((g) => raw.touched!.includes(g)) : []
      return {on, touched}
    }
  } catch {
    // hỏng → làm lại từ đầu bên dưới
  }
  const state = {on: has('chill:regular') ? inferLayout() : LAYOUT_NEW, touched: []}
  saveLayout(state)
  return state
}

export function saveLayout(state: LayoutState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // Chặn storage — lựa chọn chỉ có trong lần xem này
  }
}

// Khách tự bấm 1 nhóm
export function setGroup(state: LayoutState, group: LayoutGroup, on: boolean): LayoutState {
  return {on: {...state.on, [group]: on}, touched: state.touched.includes(group) ? state.touched : [...state.touched, group]}
}

// Nút "Gọn" / "Bày hết": tính là khách đã chọn cho mọi nhóm
export function setAll(on: Layout): LayoutState {
  return {on: {...on}, touched: [...LAYOUT_GROUPS]}
}

// Quán tự mở 1 nhóm khi tới lúc (khách chưa từng bấm nhóm đó). Trả về state cũ nếu không đổi
export function autoOpen(state: LayoutState, group: LayoutGroup): LayoutState {
  if (state.on[group] || state.touched.includes(group)) return state
  return {...state, on: {...state.on, [group]: true}}
}
