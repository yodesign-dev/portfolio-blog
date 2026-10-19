// Việc cần làm trang /chill — mảnh giấy nhỏ gắn với đồng hồ phin (Focus.tsx): bấm phin thì
// chọn "phin này làm việc gì", xong phin thì gạch. Chỉ lưu trên máy người xem — không tài khoản.
//
// Danh sách là việc của hôm nay: việc đã gạch tự biến mất khi sang ngày khác (giờ máy),
// việc chưa xong thì ở lại. Tối đa MAX_TODOS việc cho nó vẫn là mảnh giấy.

const KEY = 'chill:todo'
export const MAX_TODOS = 7
export const MAX_TODO_LENGTH = 80

export type Todo = {
  id: string
  text: string
  // Ngày gạch (YYYY-MM-DD theo giờ máy); chưa gạch thì không có
  doneDay?: string
}

const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

// Đọc + dọn việc đã gạch từ hôm trước
export function loadTodos(now = new Date()): Todo[] {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null') as unknown
    if (!Array.isArray(saved)) return []
    const today = dayKey(now)
    const todos = saved
      .filter((t): t is Todo => Boolean(t) && typeof t.id === 'string' && typeof t.text === 'string')
      .map((t) => ({id: t.id, text: t.text.slice(0, MAX_TODO_LENGTH), ...(typeof t.doneDay === 'string' ? {doneDay: t.doneDay} : {})}))
      .filter((t) => !t.doneDay || t.doneDay === today)
      .slice(0, MAX_TODOS)
    if (todos.length !== saved.length) save(todos)
    return todos
  } catch {
    return []
  }
}

function save(todos: Todo[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(todos))
  } catch {
    // Chặn storage — danh sách chỉ có trong lần xem này
  }
}

let persistAsked = false
// Xin trình duyệt đừng tự dọn bộ nhớ của trang (Safari xoá sau 7 ngày không ghé). Hỏi 1 lần
// mỗi lần tải trang, lúc khách thật sự ghi việc đầu tiên — giữ luôn thẻ khách quen, ly đã chọn…
function askPersist() {
  if (persistAsked) return
  persistAsked = true
  navigator.storage?.persist?.().catch(() => {})
}

export function addTodo(todos: Todo[], text: string): Todo[] {
  const clean = text.trim().slice(0, MAX_TODO_LENGTH)
  if (!clean || todos.length >= MAX_TODOS) return todos
  const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
  const next = [...todos, {id, text: clean}]
  save(next)
  askPersist()
  return next
}

export function setTodoDone(todos: Todo[], id: string, done: boolean, now = new Date()): Todo[] {
  const next = todos.map((t) => (t.id !== id ? t : done ? {...t, doneDay: dayKey(now)} : {id: t.id, text: t.text}))
  save(next)
  return next
}

export function removeTodo(todos: Todo[], id: string): Todo[] {
  const next = todos.filter((t) => t.id !== id)
  save(next)
  return next
}

// Số việc đã gạch hôm nay (việc gạch hôm trước đã bị loadTodos dọn)
export const doneTodayOf = (todos: Todo[], now = new Date()) => todos.filter((t) => t.doneDay === dayKey(now)).length
