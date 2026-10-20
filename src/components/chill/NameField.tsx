'use client'

// Tên của khách + nút đổi tên, gọn trên một dòng (bảng phin, tổng kết phin, màn chào).
// Đổi ở đây là đổi cho cả chat, bàn nhóm và bảng góp phin (identity.ts).

import {useState} from 'react'
import {useT} from './i18n'
import {MAX_NAME, renameMe, useMyName} from './identity'

export function NameField({label, className = ''}: {label: string; className?: string}) {
  const t = useT()
  const name = useMyName()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')
  if (!name) return null

  if (editing) {
    return (
      <form
        className={`flex items-center gap-1.5 ${className}`}
        onSubmit={(e) => {
          e.preventDefault()
          renameMe(value)
          setEditing(false)
        }}
      >
        <input
          autoFocus
          value={value}
          maxLength={MAX_NAME}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Escape' && (e.stopPropagation(), setEditing(false))}
          aria-label={t.name.label}
          className="min-w-0 flex-1 rounded-lg border border-white/15 bg-black/30 px-2.5 py-1 text-sm text-[#ede6dd] outline-none focus:border-[#e8b27d]/60"
        />
        <button type="submit" className="shrink-0 rounded-lg bg-[#e8b27d] px-2.5 py-1 text-xs font-semibold text-[#2a1a10] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e8b27d]">
          {t.name.save}
        </button>
      </form>
    )
  }
  return (
    <p className={`flex flex-wrap items-center gap-x-1.5 text-xs text-[#a79e94] ${className}`}>
      <span>{label}</span>
      <span className="font-semibold text-[#f3cfa8]">{name}</span>
      <button
        type="button"
        onClick={() => {
          setValue(name)
          setEditing(true)
        }}
        className="text-[#f3cfa8] underline underline-offset-2 hover:text-white focus-visible:outline-2 focus-visible:outline-[#e8b27d]"
      >
        {t.name.edit}
      </button>
    </p>
  )
}
