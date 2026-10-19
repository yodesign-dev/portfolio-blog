'use client'

// Mảnh giấy việc cần làm của /chill (todo.ts), dùng chung cho bảng Đồng hồ phin (Focus.tsx,
// chạm chữ = dành phin sắp pha cho việc đó) và cuốn sổ trên quầy (TodayBook.tsx, chỉ ghi và gạch).

import {useState} from 'react'
import {useT} from './i18n'
import {MAX_TODO_LENGTH, MAX_TODOS, type Todo} from './todo'

// Mảnh giấy việc cần làm: chạm chữ = dành phin sắp pha cho việc đó (chạm lại để bỏ),
// ô vuông = gạch / bỏ gạch, × = xoá. Hết chỗ thì giấu ô thêm việc
export function TodoList({
  todos,
  picked,
  onPick,
  onAdd,
  onCheck,
  onRemove,
  hint,
  heading = true,
}: {
  todos: Todo[]
  picked: string | null
  // Không truyền (cuốn sổ trên quầy) = chỉ ghi / gạch / xoá, không dành phin
  onPick?: (id: string | null) => void
  onAdd: (text: string) => void
  onCheck: (id: string, done: boolean) => void
  onRemove: (id: string) => void
  // Dòng nhắc cuối giấy; bỏ trống = lời nhắc của bảng phin
  hint?: string
  // Cuốn sổ đã có tiêu đề riêng → giấu tiêu đề "Việc hôm nay" của mảnh giấy
  heading?: boolean
}) {
  const t = useT()
  const [draft, setDraft] = useState('')
  const open = todos.some((x) => !x.doneDay)

  return (
    <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.02] p-2">
      {heading && <p className="px-1 font-mono text-[10px] uppercase tracking-[0.2em] text-[#a79e94]">{t.todo.heading}</p>}
      {todos.length > 0 && (
        <ul className={`${heading ? 'mt-1.5' : ''} space-y-0.5`}>
          {todos.map((x) => {
            const isPicked = Boolean(onPick) && picked === x.id && !x.doneDay
            return (
              <li key={x.id} className={`group flex items-center gap-1 rounded-lg border ${isPicked ? 'border-[#e8b27d]/60 bg-[#e8b27d]/10' : 'border-transparent'}`}>
                <input
                  type="checkbox"
                  checked={Boolean(x.doneDay)}
                  onChange={(e) => onCheck(x.id, e.target.checked)}
                  aria-label={t.todo.checkAria(x.text)}
                  className="ml-1.5 size-3.5 shrink-0 cursor-pointer accent-[#e8b27d]"
                />
                <button
                  type="button"
                  disabled={Boolean(x.doneDay) || !onPick}
                  onClick={() => onPick?.(isPicked ? null : x.id)}
                  aria-pressed={onPick ? isPicked : undefined}
                  className={`min-w-0 flex-1 break-words rounded-md px-1.5 py-1 text-left text-[13px] leading-snug transition focus-visible:outline-2 focus-visible:outline-[#e8b27d] ${
                    x.doneDay ? 'text-[#7d756d] line-through' : isPicked ? 'text-[#f3cfa8]' : 'text-[#ede6dd] hover:text-white'
                  }`}
                >
                  {x.text}
                  {isPicked && <span className="ml-1.5 whitespace-nowrap font-mono text-[10px] uppercase tracking-wider text-[#e8b27d]">· {t.todo.forPhin}</span>}
                </button>
                <button
                  type="button"
                  onClick={() => onRemove(x.id)}
                  aria-label={t.todo.removeAria(x.text)}
                  className="mr-0.5 shrink-0 rounded px-1.5 py-0.5 text-sm leading-none text-[#7d756d] opacity-60 transition hover:text-[#ede6dd] hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-[#e8b27d] sm:opacity-0 sm:group-hover:opacity-100"
                >
                  ×
                </button>
              </li>
            )
          })}
        </ul>
      )}
      {todos.length < MAX_TODOS ? (
        <form
          className={`${heading || todos.length > 0 ? 'mt-1.5' : ''} flex gap-1`}
          onSubmit={(e) => {
            e.preventDefault()
            onAdd(draft)
            setDraft('')
          }}
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={MAX_TODO_LENGTH}
            placeholder={t.todo.placeholder}
            aria-label={t.todo.placeholder}
            className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/20 px-2 py-1.5 text-[13px] text-[#ede6dd] placeholder:text-[#7d756d] focus:border-[#e8b27d]/60 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!draft.trim()}
            className="rounded-lg border border-white/15 px-2.5 text-xs text-[#c9c0b6] transition enabled:hover:bg-white/[0.06] enabled:hover:text-[#ede6dd] disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-[#e8b27d]"
          >
            {t.todo.add}
          </button>
        </form>
      ) : (
        <p className="mt-1.5 px-1 text-xs text-[#a79e94]">{t.todo.full}</p>
      )}
      <p className="mt-1.5 px-1 text-[11px] leading-snug text-[#7d756d]">{hint ?? (open ? t.todo.pickHint : t.todo.emptyHint)}</p>
    </div>
  )
}
