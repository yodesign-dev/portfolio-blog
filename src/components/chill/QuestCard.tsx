'use client'

// Thẻ "Cả quán cùng pha phin" trong bảng phin (Focus.tsx) — xem quest-shared.ts.
// Đang pha: thanh tiến độ cả quán + mở khoá gì · Đủ mục tiêu: nút bỏ phiếu · Xong: lựa chọn thắng.

import {useLang, useT} from './i18n'
import type {QuestState} from './quest-shared'

export function QuestCard({
  state,
  mine,
  justAdded,
  myVote,
  voteError,
  onVote,
}: {
  state: QuestState
  // Số phin máy này đã góp trong mùa (lưu trên máy)
  mine: number
  // Phin vừa xong đã được cộng → hiện 1 dòng xác nhận trong tổng kết
  justAdded: boolean
  myVote: string | null
  // 'voted' = máy này (hoặc mạng này) đã bỏ phiếu · 'retry' = lỗi mạng, bấm lại được
  voteError: 'voted' | 'retry' | null
  onVote: (option: string) => void
}) {
  const t = useT()
  const lang = useLang()
  const label = (key: string) => {
    const o = state.options.find((x) => x.key === key)
    return o ? (lang === 'vi' ? o.vi : o.en) : ''
  }
  const pct = Math.min(100, Math.round((state.count / state.goal) * 100))
  const title = lang === 'vi' ? state.title.vi : state.title.en
  const closes = state.voteEndsAt
    ? new Intl.DateTimeFormat(lang === 'vi' ? 'vi-VN' : 'en-GB', {day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'}).format(state.voteEndsAt)
    : ''

  return (
    <section className="mt-4 rounded-xl border border-[#e8b27d]/25 bg-[#e8b27d]/[0.05] px-3 py-3" aria-label={t.quest.eyebrow(title)}>
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#a79e94]">{t.quest.eyebrow(title)}</p>

      {state.phase === 'brewing' && (
        <>
          <p className="mt-1.5 font-mono text-lg tabular-nums text-[#f3cfa8]">{t.quest.progress(state.count, state.goal)}</p>
          <div
            role="progressbar"
            aria-label={t.quest.progressAria(state.count, state.goal)}
            aria-valuemin={0}
            aria-valuemax={state.goal}
            aria-valuenow={state.count}
            className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/[0.08]"
          >
            <div className="h-full rounded-full bg-[#e8b27d] transition-[width] duration-700" style={{width: `${pct}%`}} />
          </div>
          <p className="mt-2 text-xs leading-relaxed text-[#c9c0b6]">
            {t.quest.unlockHint(state.goal, state.options.map((o) => label(o.key)).join(' · '))}
          </p>
        </>
      )}

      {state.phase === 'voting' && (
        <>
          <p className="mt-1.5 text-sm font-semibold text-[#f3ece4]">{t.quest.reached(state.goal)}</p>
          {myVote ? (
            <p className="mt-2 text-sm text-[#f3cfa8]">{t.quest.voted(label(myVote))}</p>
          ) : (
            <>
              <p className="mt-1 text-xs leading-relaxed text-[#c9c0b6]">{t.quest.votePrompt}</p>
              <div className="mt-2 flex flex-col gap-1.5">
                {state.options.map((o) => (
                  <button
                    key={o.key}
                    type="button"
                    onClick={() => onVote(o.key)}
                    className="rounded-lg border border-white/15 px-3 py-2 text-left text-sm text-[#ede6dd] transition hover:border-[#e8b27d]/60 hover:bg-[#e8b27d]/10 focus-visible:outline-2 focus-visible:outline-[#e8b27d]"
                  >
                    {label(o.key)}
                  </button>
                ))}
              </div>
              {voteError && <p className="mt-2 text-xs text-[#e8a27d]">{voteError === 'voted' ? t.quest.voteFailed : t.quest.voteRetry}</p>}
            </>
          )}
          {closes && <p className="mt-2 text-[11px] text-[#a79e94]">{t.quest.voteEnds(closes)}</p>}
        </>
      )}

      {state.phase === 'done' && (
        <>
          <p className="mt-1.5 text-xs text-[#a79e94]">{t.quest.done(title)}</p>
          {state.winner ? (
            <>
              <p className="mt-1 text-sm font-semibold text-[#f3cfa8]">{t.quest.winner(label(state.winner))}</p>
              <ul className="mt-2 space-y-1">
                {state.options.map((o) => (
                  <li key={o.key} className="flex justify-between gap-3 text-xs text-[#c9c0b6]">
                    <span className="min-w-0 truncate">{label(o.key)}</span>
                    <span className="shrink-0 tabular-nums text-[#a79e94]">{t.quest.votes(state.votes?.[o.key] ?? 0)}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[11px] text-[#a79e94]">{t.quest.winnerNote}</p>
            </>
          ) : (
            <p className="mt-1 text-sm text-[#ede6dd]">{t.quest.noVotes}</p>
          )}
        </>
      )}

      {justAdded && <p className="mt-2 text-xs text-[#f3cfa8]">{t.quest.justAdded}</p>}
      {mine > 0 && !justAdded && <p className="mt-2 text-[11px] text-[#a79e94]">{t.quest.mine(mine)}</p>}
    </section>
  )
}
