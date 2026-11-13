'use client'

// Cửa sổ nổi của /chill (Document Picture-in-Picture — Chrome / Edge máy tính): cảnh quán
// thu nhỏ, luôn nằm trên các cửa sổ khác, chỉ để nghe nhạc — phát/dừng, bài trước/tiếp, danh
// sách nhạc theo trạm và nút về quán. Đổi phòng, thời tiết, điểm đến thì về quán.
//
// - Khung ngang (mặc định 400×225): danh sách mở bằng nút ☰, phủ lên cảnh
// - Khách kéo cửa sổ cao lên (dọc hơn 4:3): cảnh ở trên, danh sách luôn hiện bên dưới
//
// - Cảnh vẫn vẽ trên canvas gốc của trang; cửa sổ nổi chạy vòng vẽ bằng requestAnimationFrame
//   của chính nó (tab gốc bị ẩn thì rAF của tab đứng) rồi chép canvas gốc sang canvas nhỏ
// - Nút trong cửa sổ nổi là portal React → dùng chung state với ChillRoom
// - Trình duyệt không có API (Safari, Firefox, điện thoại) → canMiniPlayer() = false, không hiện nút

import {useEffect, useMemo, useRef, useState} from 'react'
import {createPortal} from 'react-dom'
import {useLang, useT} from './i18n'
import {HotBadge, NewBadge, NewStationBadge, PlayMeter, VocalBadge, type PlayStat} from './PlayMeter'
import {STATIONS, VOCAL_STATIONS, newStations, stationName, stationOf, type StationId, type Track} from './tracks'
import {PixelClock, type BrewControls, type BrewInfo} from './BrewDesk'

type DocumentPiP = {
  requestWindow: (opts?: {width?: number; height?: number}) => Promise<Window>
  window: Window | null
}

const pip = () => (typeof window === 'undefined' ? undefined : (window as Window & {documentPictureInPicture?: DocumentPiP}).documentPictureInPicture)

export const canMiniPlayer = () => pip() !== undefined

// Mở cửa sổ nổi 16:9 và chép CSS của trang sang (Tailwind, font). Phải gọi trong thao tác
// của người dùng (bấm nút / phím media) — trình duyệt chặn nếu không
export async function openMiniWindow(): Promise<Window | null> {
  const api = pip()
  if (!api) return null
  if (api.window) return api.window
  const win = await api.requestWindow({width: 400, height: 225})
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      const style = win.document.createElement('style')
      style.textContent = Array.from(sheet.cssRules, (r) => r.cssText).join('\n')
      win.document.head.append(style)
    } catch {
      // Stylesheet khác origin không đọc được cssRules → gắn lại bằng <link>
      if (!sheet.href) continue
      const link = win.document.createElement('link')
      link.rel = 'stylesheet'
      link.href = sheet.href
      win.document.head.append(link)
    }
  }
  win.document.documentElement.lang = document.documentElement.lang
  win.document.title = document.title
  win.document.body.style.cssText = 'margin:0;height:100vh;overflow:hidden;background:#16131a;color:#ede6dd'
  return win
}

export function MiniPlayer({
  win,
  source,
  draw,
  tracks,
  plays,
  index,
  station,
  playing,
  onTogglePlay,
  onPrev,
  onNext,
  onPick,
  onClose,
  brew = null,
  controls,
  queue = null,
}: {
  win: Window
  // Canvas gốc của cảnh
  source: React.RefObject<HTMLCanvasElement | null>
  // Vẽ 1 khung cảnh (tự giới hạn ~30fps) — true nếu vừa vẽ khung mới
  draw: React.RefObject<(now: number) => boolean>
  tracks: Track[]
  // Lượt nghe từng bài (công tắc Studio playCountsOpen tắt thì không có)
  plays?: Map<string, PlayStat>
  // Bài đang phát / chờ phát (vị trí trong `tracks`)
  index: number
  // Dòng phụ dưới tên bài: trạm · điểm đến
  station: string
  playing: boolean
  onTogglePlay: () => void
  onPrev: () => void
  onNext: () => void
  // Bấm 1 bài trong danh sách (bài đang phát thì phát/dừng)
  onPick: (i: number) => void
  onClose: () => void
  // Bàn pha phin: đồng hồ và hàng đợi nhạc
  brew?: BrewInfo | null
  controls?: React.RefObject<BrewControls | null>
  queue?: {label: string; indices: number[]} | null
}) {
  const t = useT()
  const lang = useLang()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const track = tracks[index]
  const [listOpen, setListOpen] = useState(false)
  // Tab trạm đang xem trong danh sách — mở danh sách là về trạm của bài đang phát
  const [tab, setTab] = useState<StationId | 'queue'>(queue ? 'queue' : stationOf(track))
  const freshStations = useMemo(() => newStations(tracks), [tracks])
  const [tall, setTall] = useState(false)

  // Đóng cửa sổ (nút X của trình duyệt / nút về quán / tắt trang) → báo ChillRoom
  useEffect(() => {
    win.addEventListener('pagehide', onClose)
    return () => win.removeEventListener('pagehide', onClose)
  }, [win, onClose])

  // Cửa sổ dọc hơn 4:3 → danh sách luôn hiện dưới cảnh
  useEffect(() => {
    const check = () => setTall(win.innerHeight > win.innerWidth * 0.75)
    check()
    win.addEventListener('resize', check)
    return () => win.removeEventListener('resize', check)
  }, [win])

  // Phím trong cửa sổ nổi: Space phát/dừng · N / P bài tiếp / trước · L danh sách · Esc đóng danh sách
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        if ((e.target as HTMLElement).closest?.('button')) return
        e.preventDefault()
        onTogglePlay()
      } else if (e.key === 'n' || e.key === 'N') onNext()
      else if (e.key === 'p' || e.key === 'P') onPrev()
      else if (e.key === 'l' || e.key === 'L') setListOpen((o) => !o)
      else if (e.key === 'Escape') setListOpen(false)
    }
    win.addEventListener('keydown', onKey)
    return () => win.removeEventListener('keydown', onKey)
  }, [win, onTogglePlay, onNext, onPrev])

  const showList = tall || listOpen
  const openList = () => {
    setTab(queue ? 'queue' : stationOf(track))
    setListOpen((o) => !o)
  }

  // Mở danh sách → cuộn tới bài đang phát
  useEffect(() => {
    if (!showList) return
    win.document.querySelector('[data-mini-current]')?.scrollIntoView({block: 'nearest'})
  }, [win, showList, tab])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    let raf = 0
    let first = true
    const loop = () => {
      raf = win.requestAnimationFrame(loop)
      // Thời gian lấy theo trang gốc — rAF của cửa sổ nổi có mốc giờ riêng
      const drew = draw.current(performance.now())
      const src = source.current
      if (!src || !src.width) return
      const dpr = win.devicePixelRatio || 1
      const w = Math.round(canvas.clientWidth * dpr)
      const h = Math.round(canvas.clientHeight * dpr)
      if (!w || !h) return
      const resized = canvas.width !== w || canvas.height !== h
      if (!drew && !first && !resized) return
      if (resized) {
        canvas.width = w
        canvas.height = h
      }
      first = false
      // Phủ kín khung (object-cover), cắt đều 2 bên
      const k = Math.max(w / src.width, h / src.height)
      const sw = w / k
      const sh = h / k
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(src, (src.width - sw) / 2, (src.height - sh) / 2, sw, sh, 0, 0, w, h)
    }
    raf = win.requestAnimationFrame(loop)
    return () => win.cancelAnimationFrame(raf)
  }, [win, source, draw])

  const btn = 'flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/45 text-white/90 backdrop-blur transition hover:bg-black/70'
  const list = tab === 'queue' && queue ? queue.indices.map((i) => ({tr: tracks[i], i})) : tracks.map((tr, i) => ({tr, i})).filter(({tr}) => stationOf(tr) === tab)
  const brewOn = Boolean(brew && (brew.running || brew.finished || brew.rested))
  const blockCount = brew ? (brew.minutes > 60 ? Math.ceil(brew.minutes / 2) : brew.minutes) : 0
  const pill = 'flex h-8 min-w-0 items-center justify-center rounded-full border border-white/20 px-2.5 text-xs text-[#ede6dd] transition hover:bg-white/10'
  const listLabel = listOpen ? t.room.miniListClose : t.room.miniList

  return createPortal(
    <div className="relative flex h-full w-full select-none flex-col">
      <div className={`group relative w-full ${tall ? 'aspect-video shrink-0' : 'min-h-0 flex-1'}`}>
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" role="img" aria-label={track.title} />
        <div
          className={`absolute inset-0 flex flex-col justify-between bg-gradient-to-t from-black/70 via-transparent to-black/30 p-2.5 transition-opacity duration-300 ${
            playing || brewOn ? 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100' : 'opacity-100'
          }`}
        >
          <div className="flex justify-end gap-2">
            {!tall && (
              <button type="button" onClick={openList} aria-label={listLabel} title={listLabel} aria-expanded={listOpen} className={btn}>
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
                  <path d="M4 6h16M4 12h16M4 18h10" />
                </svg>
              </button>
            )}
            <button type="button" onClick={() => win.close()} aria-label={t.room.miniReturn} title={t.room.miniReturn} className={btn}>
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              </svg>
            </button>
          </div>
          <div className={`flex items-end gap-2 ${brewOn ? 'hidden' : ''}`}>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{track.title}</p>
              <p className="truncate text-[11px] text-white/70">{station}</p>
            </div>
            <button type="button" onClick={onPrev} aria-label={t.room.prev} title={t.room.prev} className={btn}>
              <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M19 5v14l-10-7 10-7Z" />
                <rect x="5" y="5" width="2.5" height="14" rx="1" />
              </svg>
            </button>
            <button type="button" onClick={onTogglePlay} aria-label={playing ? t.room.pause : t.room.play} title={playing ? t.room.pause : t.room.play} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#e8b27d] text-[#1a1410] transition hover:bg-[#f0c494]">
              {playing ? (
                <svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <rect x="6" y="4" width="4" height="16" rx="1" />
                  <rect x="14" y="4" width="4" height="16" rx="1" />
                </svg>
              ) : (
                <svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M7 4.5v15a1 1 0 0 0 1.5.86l12-7.5a1 1 0 0 0 0-1.72l-12-7.5A1 1 0 0 0 7 4.5Z" />
                </svg>
              )}
            </button>
            <button type="button" onClick={onNext} aria-label={t.room.next} title={t.room.next} className={btn}>
              <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M5 5v14l10-7L5 5Z" />
                <rect x="16.5" y="5" width="2.5" height="14" rx="1" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {brew && brewOn && (
        <div className={`absolute inset-x-2 z-[5] rounded-xl border bg-[#16131a]/90 p-2 ${tall ? 'top-2' : 'bottom-2'} ${brew.rest || brew.finished ? 'border-[#9fd4a8]/45' : 'border-[#e8b27d]/35'}`}>
          {brew.running ? (
            <>
              <div className="flex items-center gap-2">
                <span className={`${brew.rest ? 'text-[#e3f2e5]' : 'text-[#f3cfa8]'} ${brew.paused ? 'opacity-50' : ''}`}>
                  <PixelClock text={brew.clock} className="h-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium text-white">{track.title}</span>
                  <span className="block truncate font-mono text-[9px] uppercase tracking-[0.12em] text-[#a79e94]">{station}</span>
                </span>
                <button type="button" onClick={onTogglePlay} aria-label={playing ? t.room.pause : t.room.play} title={playing ? t.room.pause : t.room.play} className="flex size-8 shrink-0 items-center justify-center rounded-full text-[#ede6dd] transition hover:bg-white/10">
                  <svg width={13} height={13} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d={playing ? 'M6 4h4v16H6zM14 4h4v16h-4z' : 'M7 4.5v15l13-7.5z'} />
                  </svg>
                </button>
                <button type="button" onClick={onNext} aria-label={t.room.next} title={t.room.next} className="flex size-8 shrink-0 items-center justify-center rounded-full text-[#ede6dd] transition hover:bg-white/10">
                  <svg width={13} height={13} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M5 5v14l10-7L5 5Z" />
                    <rect x="16.5" y="5" width="2.5" height="14" />
                  </svg>
                </button>
                {brew.rest ? (
                  <button type="button" onClick={() => controls?.current?.skipBreak()} className="flex h-8 shrink-0 items-center rounded-full bg-[#9fd4a8] px-2.5 text-xs font-semibold text-[#14261a] transition hover:bg-[#b3dfba]">
                    {t.focus.again}
                  </button>
                ) : (
                  <button type="button" onClick={() => controls?.current?.togglePause()} className="flex h-8 shrink-0 items-center rounded-full bg-[#e8b27d] px-2.5 text-xs font-semibold text-[#2a1a10] transition hover:bg-[#f0c294]">
                    {brew.paused ? t.focus.resume : t.focus.pause}
                  </button>
                )}
              </div>
              <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(brew.progress * 100)} className="mt-1.5 flex h-1.5 gap-px">
                {Array.from({length: blockCount}).map((_, i) => (
                  <i key={i} className={`min-w-0 flex-1 ${i < Math.floor(brew.progress * blockCount) ? (brew.rest ? 'bg-[#9fd4a8]' : 'bg-[#e8b27d]') : 'bg-white/10'}`} />
                ))}
              </div>
            </>
          ) : (
            <div role="status" className="grid gap-1.5">
              <p className="text-sm font-bold text-white">{brew.finished ? t.focus.doneTitle(brew.finished.minutes) : t.focus.restedTitle}</p>
              {brew.finished?.task && !brew.finished.taskDone && (
                <p className="flex items-center gap-2 text-xs text-[#c9c0b6]">
                  <span className="min-w-0 flex-1 truncate">{brew.finished.task}</span>
                  <button type="button" onClick={() => controls?.current?.finishTask()} className="shrink-0 font-semibold text-[#f3cfa8] underline underline-offset-2">
                    {t.todo.markDone}
                  </button>
                </p>
              )}
              <div className="flex gap-1.5">
                {brew.finished && (
                  <button type="button" onClick={() => controls?.current?.takeBreak()} className="flex h-8 flex-1 items-center justify-center rounded-full bg-[#9fd4a8] px-2 text-xs font-semibold text-[#14261a] transition hover:bg-[#b3dfba]">
                    {t.focus.takeBreak(brew.nextBreak, brew.nextBreak > 5)}
                  </button>
                )}
                <button type="button" onClick={() => controls?.current?.brewAgain()} className={pill}>
                  {t.focus.again}
                </button>
                <button type="button" onClick={() => win.close()} className={pill}>
                  {t.room.miniReturn}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {showList && (
        <div className={`flex min-h-0 flex-col bg-[#16131a] ${tall ? 'flex-1 border-t border-white/10' : 'absolute inset-0 z-10 bg-[#16131a]/95 backdrop-blur'}`}>
          <div className="flex shrink-0 items-center gap-1.5 overflow-x-auto px-2.5 pb-1.5 pt-2.5 [scrollbar-width:none]" role="radiogroup" aria-label={t.room.stationAria}>
            {queue && (
              <button
                type="button"
                role="radio"
                aria-checked={tab === 'queue'}
                onClick={() => setTab('queue')}
                className={`shrink-0 rounded-full border px-2.5 py-1 text-xs transition ${
                  tab === 'queue' ? 'border-[#e8b27d]/60 bg-[#e8b27d]/15 text-[#f3cfa8]' : 'border-white/10 text-[#a79e94] hover:border-white/25 hover:text-[#ede6dd]'
                }`}
              >
                {queue.label}
              </button>
            )}
            {STATIONS.map((st) => {
              const count = tracks.filter((tr) => stationOf(tr) === st.id).length
              if (!count) return null
              const on = st.id === tab
              return (
                <button
                  key={st.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setTab(st.id)}
                  className={`shrink-0 rounded-full border px-2.5 py-1 text-xs transition ${
                    on ? 'border-[#e8b27d]/60 bg-[#e8b27d]/15 text-[#f3cfa8]' : 'border-white/10 text-[#a79e94] hover:border-white/25 hover:text-[#ede6dd]'
                  }`}
                >
                  {stationName(st, lang, 'short')}
                  {freshStations.has(st.id) && <NewStationBadge />}
                </button>
              )
            })}
            {!tall && (
              <button type="button" onClick={() => setListOpen(false)} aria-label={t.room.miniListClose} title={t.room.miniListClose} className="ml-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[#a79e94] transition hover:bg-white/10 hover:text-[#ede6dd]">
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            )}
          </div>
          <ol className="min-h-0 flex-1 overflow-y-auto px-1.5 pb-2">
            {list.map(({tr, i}, pos) => {
              const active = i === index
              return (
                <li key={tr.id}>
                  <button
                    type="button"
                    onClick={() => onPick(i)}
                    aria-current={active ? 'true' : undefined}
                    data-mini-current={active ? '' : undefined}
                    className={`grid w-full grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-2 rounded-md px-2 py-1.5 text-left transition ${
                      active ? 'bg-white/[0.06]' : 'hover:bg-white/[0.04]'
                    }`}
                  >
                    <span className="font-mono text-[11px] tabular-nums text-[#a79e94]">{active && playing ? '♪' : String(pos + 1).padStart(2, '0')}</span>
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span className={`truncate text-[13px] ${active ? 'font-medium text-[#f3cfa8]' : 'text-[#ede6dd]'}`}>{tr.title}</span>
                      <NewBadge track={tr} quiet={freshStations.has(stationOf(tr))} />
                      <VocalBadge track={tr} quiet={tab !== 'queue' && VOCAL_STATIONS.has(stationOf(tr))} />
                      <HotBadge stat={plays?.get(tr.id)} />
                    </span>
                    <span className="flex items-center gap-2 font-mono text-[11px] tabular-nums text-[#a79e94]">
                      <PlayMeter stat={plays?.get(tr.id)} />
                      {tr.duration ? `${Math.floor(tr.duration / 60)}:${String(Math.round(tr.duration % 60)).padStart(2, '0')}` : '–:––'}
                    </span>
                  </button>
                </li>
              )
            })}
          </ol>
        </div>
      )}
    </div>,
    win.document.body
  )
}
