'use client'

// Cuốn sổ trên quầy /chill = "Việc hôm nay": bấm sổ mở mảnh giấy việc cần làm (todo.ts),
// cùng danh sách với bảng Đồng hồ phin. Ở đây chỉ ghi / gạch / xoá; dành phin cho việc nào
// thì chọn trong bảng phin (nút "Pha một phin" mở bảng đó).
//
// - Máy tính: bảng nổi giữa màn, phía trên quầy. Điện thoại: sheet từ dưới lên
// - Đóng: nút ×, Esc, hoặc chạm ra ngoài

import {useEffect, useRef, useState} from 'react'
import {trackEvent} from '@/lib/analytics'
import {useT} from './i18n'
import {TodoList} from './TodoList'
import {addTodo, doneTodayOf, loadTodos, removeTodo, setTodoDone, type Todo} from './todo'

export function TodayBook({open, onClose, onBrew}: {open: boolean; onClose: () => void; onBrew: () => void}) {
  const t = useT()
  const [todos, setTodos] = useState<Todo[]>([])
  const ref = useRef<HTMLDivElement>(null)

  // Mở sổ thì đọc lại — bảng phin có thể vừa ghi / gạch
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => (open ? setTodos(loadTodos()) : undefined), [open])

  useEffect(() => {
    if (!open) return
    // Chạm lại cuốn sổ trên quầy thì để nút đó tự xử, khỏi đóng rồi mở lại ngay
    const onDown = (e: PointerEvent) => {
      const target = e.target as Element
      if (!ref.current?.contains(target) && !target.closest?.('[data-today-book]')) onClose()
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null
  const done = doneTodayOf(todos)

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={t.todo.bookLabel}
      className="fixed inset-x-0 bottom-0 z-40 max-h-[80dvh] overflow-y-auto overscroll-contain rounded-t-2xl border border-white/10 bg-[#1b1a21]/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-left text-[#ede6dd] shadow-[0_20px_50px_-15px_rgba(0,0,0,0.9)] backdrop-blur-xl motion-safe:animate-[chill-pop_0.25s_ease-out] sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-[18%] sm:w-[340px] sm:-translate-x-1/2 sm:rounded-2xl"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#e8b27d]">{t.todo.bookLabel}</p>
          {todos.length > 0 && <p className="mt-1 text-xs text-[#a79e94]">{t.todo.bookCount(done, todos.length)}</p>}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t.todo.close}
          className="-mr-1 -mt-1 rounded-full px-2 py-0.5 text-lg leading-none text-[#a79e94] transition hover:text-[#ede6dd] focus-visible:outline-2 focus-visible:outline-[#e8b27d]"
        >
          ×
        </button>
      </div>
      <TodoList
        todos={todos}
        picked={null}
        heading={false}
        hint={t.todo.bookHint}
        onAdd={(text) => {
          const next = addTodo(todos, text)
          if (next === todos) return
          setTodos(next)
          trackEvent({name: 'Chill Todo', props: {action: 'add'}})
        }}
        onCheck={(id, value) => {
          setTodos(setTodoDone(todos, id, value))
          if (value) trackEvent({name: 'Chill Todo', props: {action: 'done'}})
        }}
        onRemove={(id) => setTodos(removeTodo(todos, id))}
      />
      <button
        type="button"
        onClick={onBrew}
        className="mt-3 w-full rounded-full bg-[#e8b27d] py-2.5 text-sm font-semibold text-[#2a1a10] transition hover:bg-[#f0c294] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e8b27d]"
      >
        {t.todo.brew}
      </button>
    </div>
  )
}

// Sao pixel lấp lánh quanh cuốn sổ (cùng kiểu mẩu nhật ký mới); tắt khi giảm chuyển động
export function BookSparkles() {
  // [trái %, trên %, cỡ px, trễ s]
  const stars: [number, number, number, number][] = [
    [-8, -10, 12, 0],
    [96, -18, 10, 0.6],
    [104, 55, 12, 1.2],
    [-12, 60, 9, 1.7],
    [45, -28, 8, 0.9],
  ]
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0">
      {stars.map(([left, top, size, delay], i) => (
        <svg key={i} className="chill-twinkle absolute" style={{left: `${left}%`, top: `${top}%`, animationDelay: `${delay}s`}} width={size} height={size} viewBox="0 0 5 5" shapeRendering="crispEdges">
          <path d="M2 0h1v2h2v1H3v2H2V3H0V2h2z" fill="#fff3c4" />
          <rect x="2" y="2" width="1" height="1" fill="#ffffff" />
        </svg>
      ))}
    </span>
  )
}
