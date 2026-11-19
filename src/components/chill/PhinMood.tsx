'use client'

// "Phin này thế nào?" — hỏi một chạm trong tổng kết phin (công tắc Studio phinMoodOpen, thử bằng
// ?phinmood=1). Khách vừa làm xong việc là lúc có chuyện để ghi nhất, mà mở sổ rồi gõ là rào cản
// lớn nhất của Nhật ký. Ở đây một chạm vào tâm trạng là có một mẩu trong sổ riêng.
//
// - Mẩu một chạm chỉ có tâm trạng + dòng "Xong một phin N phút", cất vào sổ riêng trên máy khách,
//   không gửi đi đâu và KHÔNG tính vào hạn 2 mẩu mỗi ngày (Diary.tsx: `auto`)
// - "Thêm một câu" mở sổ ở form viết, chọn sẵn tâm trạng đó và "cất vào sổ"; viết xong thì mẩu
//   có chữ thay cho mẩu một chạm (mẩu có chữ tính vào hạn như thường)
// - Không tim, không chuỗi ngày: dòng cuối chỉ đếm số mẩu của tuần, bỏ ngày nào cũng không mất gì
//
// Nhật ký giữ sổ trong state của nó (Diary.tsx) nên ở đây chỉ phát sự kiện, Diary nghe và ghi.

import {useRef, useState} from 'react'
import {useT} from './i18n'
import {KEEP_DAYS, MOODS, recentDays, type Mood} from './diary-shared'

export const PHIN_MOOD_EVENT = 'chill:diary-phin'
export type PhinMoodDetail = {action: 'add'; id: string; mood: Mood; minutes: number} | {action: 'undo'; id: string} | {action: 'write'; id: string; mood: Mood}

const send = (detail: PhinMoodDetail) => window.dispatchEvent(new CustomEvent<PhinMoodDetail>(PHIN_MOOD_EVENT, {detail}))

// Số mẩu của khách trong tuần (đọc thẳng bộ nhớ máy: sổ của Diary lưu ở chill:diary)
function weekNotes() {
  try {
    const raw = JSON.parse(localStorage.getItem('chill:diary') ?? 'null') as {mine?: {day?: string}[]} | null
    const days = recentDays(KEEP_DAYS)
    return Array.isArray(raw?.mine) ? raw.mine.filter((n) => typeof n?.day === 'string' && days.includes(n.day)).length : 0
  } catch {
    return 0
  }
}

// `at` = lúc phin xong (ms): làm gốc cho id mẩu, mỗi phin một dãy id riêng
export function PhinMood({minutes, at}: {minutes: number; at: number}) {
  const t = useT()
  const tries = useRef(0)
  const [picked, setPicked] = useState<{id: string; mood: Mood; week: number} | null>(null)

  const pick = (mood: Mood) => {
    // Đổi ý chọn tâm trạng khác: bỏ mẩu vừa ghi, ghi mẩu mới
    if (picked) send({action: 'undo', id: picked.id})
    tries.current += 1
    const id = `phin-${at.toString(36)}-${tries.current}`
    const week = picked ? picked.week : weekNotes() + 1
    send({action: 'add', id, mood, minutes})
    setPicked({id, mood, week})
  }

  return (
    <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3">
      <p id="chill-phin-mood" className="text-sm font-semibold text-[#f3ece4]">
        {t.diary.phinAsk}
      </p>
      <div role="group" aria-labelledby="chill-phin-mood" className="mt-2 flex flex-wrap gap-1.5">
        {MOODS.map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={picked?.mood === m}
            onClick={() => pick(m)}
            className={`flex h-9 items-center rounded-lg border px-3 text-[13px] transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e8b27d] touch:h-11 ${
              picked?.mood === m ? 'border-[#e8b27d] bg-[#e8b27d] font-semibold text-[#2a1a10]' : 'border-white/15 text-[#ede6dd] hover:bg-white/[0.07]'
            }`}
          >
            {t.diary.moods[m]}
          </button>
        ))}
      </div>
      {picked && (
        // Không đặt role="status" ở đây: cả tổng kết phin đã là một vùng status, lồng thêm thì đọc lặp
        <div className="mt-2.5">
          <p className="text-[13px] leading-snug text-[#c9c0b6]">
            {t.diary.phinSaved} {t.diary.phinWeek(picked.week)}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => send({action: 'write', id: picked.id, mood: picked.mood})}
              className="flex h-9 items-center rounded-lg bg-[#e8b27d] px-3 text-[13px] font-semibold text-[#2a1a10] transition hover:bg-[#f0c294] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e8b27d] touch:h-11"
            >
              {t.diary.phinAdd}
            </button>
            <button
              type="button"
              onClick={() => {
                send({action: 'undo', id: picked.id})
                setPicked(null)
              }}
              className="flex h-9 items-center rounded-lg border border-white/15 px-3 text-[13px] text-[#c9c0b6] transition hover:bg-white/[0.07] hover:text-[#ede6dd] focus-visible:outline-2 focus-visible:outline-[#e8b27d] touch:h-11"
            >
              {t.diary.phinUndo}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
