'use client'

// Mục Nhạc của Bàn pha phin: Quán chọn giúp / Tôi tự chọn / Nhạc đang nghe, tiếng nền riêng cho
// phiên và nhạc giờ nghỉ, cùng bảng chọn bài (thư viện của quán + danh sách). Hàm gợi ý và phần
// lưu trên máy nằm ở playlist.ts; phát nhạc và hàng đợi nằm ở ChillRoom.

import {useCallback, useEffect, useMemo, useState} from 'react'
import {trackEvent} from '@/lib/analytics'
import {useT} from './i18n'
import {
  BREAK_MODES,
  LIST_SLOTS,
  MAX_LIST_NAME,
  MAX_LIST_TRACKS,
  MOODS,
  SESSION_MIXES,
  SOURCES,
  defaultPrefs,
  loadPrefs,
  loadRecent,
  loadSkips,
  savePrefs,
  suggestQueue,
  swapOne,
  totalSeconds,
  type BrewMusicPrefs,
  type BreakMode,
  type Mood,
  type MusicSource,
  type SessionMix,
} from './playlist'
import {STATIONS, stationOf, type StationId, type Track} from './tracks'

const SHOWN_SUGGESTIONS = 4

export function useBrewMusic({enabled, tracks, time, weather, playing}: {enabled: boolean; tracks: Track[]; time: string; weather: string; playing: boolean}) {
  const t = useT()
  const names = t.brew.listNames
  const [prefs, setPrefs] = useState<BrewMusicPrefs>(() => defaultPrefs(names))
  const [suggestion, setSuggestion] = useState<string[]>([])
  const [minutes, setMinutesState] = useState(25)
  const [pickerOpen, setPickerOpen] = useState(false)
  const byId = useMemo(() => new Map(tracks.map((tr) => [tr.id, tr])), [tracks])

  const suggest = useCallback(
    (mood: Mood, length: number, exclude: string[] = []) => suggestQueue({tracks, mood, minutes: length, exclude, recent: loadRecent(), skips: loadSkips(), time, weather}),
    [tracks, time, weather]
  )

  useEffect(() => {
    if (!enabled) return
    const loaded = loadPrefs(names)
    /* eslint-disable react-hooks/set-state-in-effect -- đọc lựa chọn đã lưu sau khi hydrate */
    setPrefs(loaded)
    setSuggestion(suggestQueue({tracks, mood: loaded.mood, minutes: 25, recent: loadRecent(), skips: loadSkips()}))
    /* eslint-enable react-hooks/set-state-in-effect */
    // Chỉ đọc 1 lần khi bật; đổi ngôn ngữ không đọc lại
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled])

  const update = useCallback((fn: (p: BrewMusicPrefs) => BrewMusicPrefs) => {
    setPrefs((p) => {
      const next = fn(p)
      savePrefs(next)
      return next
    })
  }, [])

  const setMinutes = useCallback(
    (m: number) => {
      if (m === minutes) return
      setMinutesState(m)
      // Bộ hiện tại vẫn vừa độ dài mới thì giữ, khỏi đổi bài trước mắt khách
      const secs = totalSeconds(suggestion, byId)
      if (secs < m * 60 || secs >= m * 60 + 200) setSuggestion(suggest(prefs.mood, m))
    },
    [minutes, suggestion, byId, suggest, prefs.mood]
  )

  const setSource = useCallback((source: MusicSource) => update((p) => ({...p, source})), [update])
  const setMood = useCallback(
    (mood: Mood) => {
      update((p) => ({...p, mood, source: 'suggest'}))
      setSuggestion(suggest(mood, minutes))
    },
    [update, suggest, minutes]
  )
  const reroll = useCallback(() => {
    setSuggestion((s) => suggest(prefs.mood, minutes, s))
    trackEvent({name: 'Chill Focus', props: {action: 'music-reroll'}})
  }, [suggest, prefs.mood, minutes])
  const swapAt = useCallback(
    (at: number) => setSuggestion((s) => swapOne(s, at, {tracks, mood: prefs.mood, recent: loadRecent(), skips: loadSkips(), time, weather})),
    [tracks, prefs.mood, time, weather]
  )

  const editActive = useCallback(
    (fn: (ids: string[]) => string[]) =>
      update((p) => ({...p, lists: p.lists.map((l, i) => (i === p.active ? {...l, ids: fn(l.ids).slice(0, MAX_LIST_TRACKS)} : l))})),
    [update]
  )
  const toggleInList = useCallback(
    (id: string) => {
      editActive((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]))
      trackEvent({name: 'Chill Focus', props: {action: 'music-save'}})
    },
    [editActive]
  )
  const moveInList = useCallback(
    (from: number, to: number) =>
      editActive((ids) => {
        if (to < 0 || to >= ids.length) return ids
        const next = [...ids]
        const [moved] = next.splice(from, 1)
        next.splice(to, 0, moved)
        return next
      }),
    [editActive]
  )
  const removeFromList = useCallback((at: number) => editActive((ids) => ids.filter((_, i) => i !== at)), [editActive])
  // Lưu cả bộ quán chọn thành danh sách, rồi mở bảng để khách sửa tiếp
  const saveSuggestion = useCallback(() => {
    editActive((ids) => [...ids, ...suggestion.filter((id) => !ids.includes(id))])
    setSource('list')
    setPickerOpen(true)
    trackEvent({name: 'Chill Focus', props: {action: 'music-save'}})
  }, [editActive, suggestion, setSource])
  const setActive = useCallback((active: number) => update((p) => ({...p, active})), [update])
  const renameActive = useCallback(
    (name: string) => update((p) => ({...p, lists: p.lists.map((l, i) => (i === p.active ? {...l, name: name.slice(0, MAX_LIST_NAME)} : l))})),
    [update]
  )
  const setMix = useCallback((mix: SessionMix) => update((p) => ({...p, mix})), [update])
  const setBreakMode = useCallback((breakMode: BreakMode) => update((p) => ({...p, breakMode})), [update])

  // Chưa chọn lần nào: đang nghe nhạc thì không đổi nhạc của khách
  const source: MusicSource = prefs.source ?? (playing ? 'current' : 'suggest')

  return {
    prefs,
    source,
    suggestion,
    minutes,
    byId,
    pickerOpen,
    suggest,
    setMinutes,
    setSource,
    setMood,
    reroll,
    swapAt,
    toggleInList,
    moveInList,
    removeFromList,
    saveSuggestion,
    setActive,
    renameActive,
    setMix,
    setBreakMode,
    setPickerOpen,
  }
}

export type BrewMusicApi = ReturnType<typeof useBrewMusic>

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

const segOn = 'bg-[#e8b27d]/15 font-medium text-[#f3cfa8]'
const segOff = 'text-[#a79e94] hover:bg-white/[0.04] hover:text-[#ede6dd]'
const label = 'font-mono text-[10px] uppercase tracking-[0.2em] text-[#a79e94]'
const ghost = 'rounded-full border border-white/15 px-3 py-2 text-xs text-[#c9c0b6] transition hover:bg-white/[0.06] hover:text-[#ede6dd] focus-visible:outline-2 focus-visible:outline-[#e8b27d]'

function Options<T extends string>({items, value, onChange, aria, columns}: {items: {id: T; label: string}[]; value: T; onChange: (id: T) => void; aria: string; columns: string}) {
  return (
    <div role="radiogroup" aria-label={aria} className={`grid gap-1 rounded-xl border border-white/10 p-1 ${columns}`}>
      {items.map((it) => (
        <button
          key={it.id}
          type="button"
          role="radio"
          aria-checked={value === it.id}
          onClick={() => onChange(it.id)}
          className={`min-h-9 rounded-lg px-1 py-1.5 text-xs leading-tight transition focus-visible:outline-2 focus-visible:outline-[#e8b27d] ${value === it.id ? segOn : segOff}`}
        >
          {it.label}
        </button>
      ))}
    </div>
  )
}

function ListChips({api}: {api: BrewMusicApi}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {api.prefs.lists.slice(0, LIST_SLOTS).map((l, i) => (
        <button
          key={i}
          type="button"
          aria-pressed={api.prefs.active === i}
          onClick={() => api.setActive(i)}
          className={`min-h-8 rounded-full border px-3 py-1 text-xs transition focus-visible:outline-2 focus-visible:outline-[#e8b27d] ${
            api.prefs.active === i ? 'border-[#e8b27d]/60 bg-[#e8b27d]/15 font-medium text-[#f3cfa8]' : 'border-white/10 text-[#c9c0b6] hover:text-[#ede6dd]'
          }`}
        >
          {l.name}
        </button>
      ))}
    </div>
  )
}

// Trong bảng chuẩn bị phin
export function MusicChooser({api, currentTitle, currentStation}: {api: BrewMusicApi; currentTitle: string; currentStation: string}) {
  const t = useT()
  const {prefs, source, suggestion, byId, minutes} = api
  const list = prefs.lists[prefs.active]
  const found = list.ids.filter((id) => byId.has(id))
  const listMin = Math.round(totalSeconds(found, byId) / 60)
  const suggestMin = Math.round(totalSeconds(suggestion, byId) / 60)
  return (
    <div className="mt-3 space-y-3 border-t border-white/[0.08] pt-3">
      <div className="space-y-1.5">
        <p className={label}>{t.brew.music}</p>
        <Options
          aria={t.brew.music}
          columns="grid-cols-3"
          value={source}
          onChange={api.setSource}
          items={SOURCES.map((id) => ({id, label: t.brew.sources[id]}))}
        />
      </div>

      {source === 'suggest' && (
        <div className="space-y-2">
          <Options aria={t.brew.moodAria} columns="grid-cols-4" value={prefs.mood} onChange={api.setMood} items={MOODS.map((id) => ({id, label: t.brew.moods[id]}))} />
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-2.5">
            <p className="text-[11px] leading-snug text-[#a79e94]">{t.brew.moodWhy[prefs.mood]}</p>
            <ol className="mt-1.5">
              {suggestion.slice(0, SHOWN_SUGGESTIONS).map((id, i) => (
                <li key={id} className="flex items-center gap-2 text-xs text-[#ede6dd]">
                  <span className="w-3 shrink-0 font-mono text-[11px] text-[#a79e94]">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate">{byId.get(id)?.title}</span>
                  <button
                    type="button"
                    onClick={() => api.swapAt(i)}
                    aria-label={t.brew.swapAria(byId.get(id)?.title ?? '')}
                    title={t.brew.swap}
                    className="size-7 shrink-0 rounded-md text-sm text-[#a79e94] transition hover:bg-white/[0.07] hover:text-[#ede6dd] focus-visible:outline-2 focus-visible:outline-[#e8b27d]"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ol>
            <p className="mt-1 text-[11px] text-[#a79e94]">
              {suggestion.length > SHOWN_SUGGESTIONS ? `+${suggestion.length - SHOWN_SUGGESTIONS} · ` : ''}
              {t.brew.tally(suggestion.length, suggestMin)}
            </p>
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              <button type="button" onClick={api.reroll} className={`${ghost} border-[#e8b27d]/50 text-[#f3cfa8]`}>
                {t.brew.reroll}
              </button>
              <button type="button" onClick={api.saveSuggestion} className={ghost}>
                {t.brew.saveAll}
              </button>
            </div>
          </div>
        </div>
      )}

      {source === 'list' && (
        <div className="space-y-2 rounded-xl border border-white/10 bg-white/[0.02] p-2.5">
          <ListChips api={api} />
          {found.length > 0 ? (
            <>
              <ol className="text-xs text-[#ede6dd]">
                {found.slice(0, 3).map((id, i) => (
                  <li key={id} className="flex gap-2 py-0.5">
                    <span className="w-3 shrink-0 font-mono text-[11px] text-[#a79e94]">{i + 1}</span>
                    <span className="min-w-0 truncate">{byId.get(id)?.title}</span>
                  </li>
                ))}
              </ol>
              <p className="text-[11px] leading-snug text-[#a79e94]">
                {found.length > 3 ? `+${found.length - 3} · ` : ''}
                {t.brew.tally(found.length, listMin)}
                {listMin < minutes ? ` · ${t.brew.loops(minutes)}` : ''}
              </p>
            </>
          ) : (
            <p className="text-[11px] leading-snug text-[#a79e94]">{t.brew.emptyList}</p>
          )}
          <button type="button" onClick={() => api.setPickerOpen(true)} className={`${ghost} w-full border-[#e8b27d]/50 text-[#f3cfa8]`}>
            {t.brew.editList}
          </button>
        </div>
      )}

      {source === 'current' && (
        <p className="rounded-xl border border-white/10 bg-white/[0.02] p-2.5 text-[11px] leading-snug text-[#a79e94]">
          <span className="block text-xs font-medium text-[#ede6dd]">{currentTitle}</span>
          {currentStation} · {t.brew.keepHint}
        </p>
      )}

      <div className="space-y-1.5">
        <p className={label}>{t.brew.ambience}</p>
        <Options aria={t.brew.ambience} columns="grid-cols-4" value={prefs.mix} onChange={api.setMix} items={SESSION_MIXES.map((id) => ({id, label: t.mix.presets[id]}))} />
      </div>
      <div className="space-y-1.5">
        <p className={label}>{t.brew.breakMusic}</p>
        <Options aria={t.brew.breakMusic} columns="grid-cols-3" value={prefs.breakMode} onChange={api.setBreakMode} items={BREAK_MODES.map((id) => ({id, label: t.brew.breakModes[id]}))} />
      </div>
    </div>
  )
}

// Bảng chọn bài: thư viện của quán + danh sách đang sửa
export function MusicPicker({api, tracks, playingId, onPreview}: {api: BrewMusicApi; tracks: Track[]; playingId: string | null; onPreview?: (id: string) => void}) {
  const t = useT()
  const {prefs, byId} = api
  const stations = useMemo(() => STATIONS.filter((st) => st.id !== 'night' && tracks.some((tr) => stationOf(tr) === st.id)), [tracks])
  const [tab, setTab] = useState<StationId>(() => stations[0]?.id ?? 'focus')
  // Điện thoại: 1 cột, gạt giữa thư viện và danh sách
  const [pane, setPane] = useState<'library' | 'list'>('library')
  const [dragFrom, setDragFrom] = useState<number | null>(null)
  const list = prefs.lists[prefs.active]
  const found = list.ids.map((id, at) => ({id, at})).filter((x) => byId.has(x.id))
  const hidden = list.ids.length - found.length
  const totalMin = Math.round(totalSeconds(list.ids, byId) / 60)
  const close = () => api.setPickerOpen(false)

  useEffect(() => {
    // Bắt Esc trước để không đóng luôn bảng phin phía sau
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      api.setPickerOpen(false)
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [api])

  return (
    <div data-brew-keep className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-5" onPointerDown={(e) => e.target === e.currentTarget && close()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t.brew.pickerTitle}
        className="flex h-[88dvh] w-full max-w-[860px] flex-col rounded-t-2xl border border-white/10 bg-[#1b1a21] p-4 text-left text-[#ede6dd] shadow-[0_20px_50px_-15px_rgba(0,0,0,0.9)] sm:h-[min(640px,calc(100dvh-2.5rem))] sm:rounded-2xl"
      >
        <div className="flex items-center justify-between gap-3">
          <p className="font-semibold">{t.brew.pickerTitle}</p>
          <button type="button" onClick={close} className="rounded-full bg-[#e8b27d] px-4 py-2 text-xs font-semibold text-[#2a1a10] transition hover:bg-[#f0c294] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e8b27d]">
            {t.brew.done}
          </button>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-1 rounded-xl border border-white/10 p-1 sm:hidden">
          {(['library', 'list'] as const).map((id) => (
            <button key={id} type="button" aria-pressed={pane === id} onClick={() => setPane(id)} className={`min-h-9 rounded-lg text-xs ${pane === id ? segOn : segOff}`}>
              {id === 'library' ? t.brew.library : `${list.name} · ${found.length}`}
            </button>
          ))}
        </div>

        <div className="mt-3 grid min-h-0 flex-1 gap-5 sm:grid-cols-2">
          {/* Thư viện */}
          <div className={`min-h-0 flex-col gap-2 ${pane === 'library' ? 'flex' : 'hidden'} sm:flex`}>
            <p className={`${label} hidden sm:block`}>{t.brew.library}</p>
            <div className="flex flex-wrap gap-1">
              {stations.map((st) => (
                <button key={st.id} type="button" aria-pressed={tab === st.id} onClick={() => setTab(st.id)} className={`min-h-8 rounded-full px-3 py-1 text-xs transition ${tab === st.id ? segOn : segOff}`}>
                  {st.short}
                </button>
              ))}
            </div>
            <ul className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {tracks
                .filter((tr) => stationOf(tr) === tab)
                .map((tr) => {
                  const inList = list.ids.includes(tr.id)
                  return (
                    <li key={tr.id} className="flex items-center gap-1.5 rounded-lg py-1 pl-1 hover:bg-white/[0.04]">
                      {onPreview && (
                        <button
                          type="button"
                          onClick={() => onPreview(tr.id)}
                          aria-label={t.brew.preview(tr.title)}
                          title={t.brew.previewShort}
                          className={`flex size-8 shrink-0 items-center justify-center rounded-full transition hover:bg-white/[0.08] focus-visible:outline-2 focus-visible:outline-[#e8b27d] ${playingId === tr.id ? 'text-[#f3cfa8]' : 'text-[#a79e94]'}`}
                        >
                          <svg width="11" height="11" viewBox="0 0 15 15" fill="currentColor" aria-hidden>
                            <path d="M3 1.5v12l10-6z" />
                          </svg>
                        </button>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className={`block truncate text-[13px] font-medium ${playingId === tr.id ? 'text-[#f3cfa8]' : ''}`}>{tr.title}</span>
                        <span className="block truncate text-[11px] text-[#a79e94]">{tr.mood}</span>
                      </span>
                      <span className="shrink-0 font-mono text-[11px] tabular-nums text-[#a79e94]">{fmt(tr.duration)}</span>
                      <AddTrackButton inList={inList} title={tr.title} full={!inList && list.ids.length >= MAX_LIST_TRACKS} onToggle={() => api.toggleInList(tr.id)} />
                    </li>
                  )
                })}
            </ul>
          </div>

          {/* Danh sách */}
          <div className={`min-h-0 flex-col gap-2 ${pane === 'list' ? 'flex' : 'hidden'} sm:flex`}>
            <ListChips api={api} />
            <input
              id="chill-brew-list-name"
              value={list.name}
              onChange={(e) => api.renameActive(e.target.value)}
              maxLength={MAX_LIST_NAME}
              aria-label={t.brew.renameAria}
              className="rounded-lg border border-white/10 bg-black/20 px-2.5 py-1.5 text-[13px] text-[#ede6dd] focus:border-[#e8b27d]/60 focus:outline-none"
            />
            <ol className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {found.length === 0 && <li className="p-2 text-xs leading-relaxed text-[#a79e94]">{t.brew.emptyPicker}</li>}
              {found.map(({id, at}, i) => {
                const tr = byId.get(id)!
                return (
                  <li
                    key={id}
                    draggable
                    onDragStart={() => setDragFrom(at)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (dragFrom !== null) api.moveInList(dragFrom, at)
                      setDragFrom(null)
                    }}
                    className="flex items-center gap-1 rounded-lg py-0.5 pl-2 hover:bg-white/[0.04]"
                  >
                    <span className="w-4 shrink-0 font-mono text-[11px] text-[#a79e94]">{i + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate text-[13px] font-medium ${playingId === id ? 'text-[#f3cfa8]' : ''}`}>{tr.title}</span>
                      <span className="block truncate font-mono text-[10px] text-[#a79e94]">{fmt(tr.duration)}</span>
                    </span>
                    <MoveButton label={t.brew.moveUp(tr.title)} disabled={at === 0} onClick={() => api.moveInList(at, at - 1)} up />
                    <MoveButton label={t.brew.moveDown(tr.title)} disabled={at === list.ids.length - 1} onClick={() => api.moveInList(at, at + 1)} />
                    <button
                      type="button"
                      onClick={() => api.removeFromList(at)}
                      aria-label={t.brew.removeAria(tr.title)}
                      className="size-8 shrink-0 rounded-md text-sm text-[#a79e94] transition hover:bg-white/[0.07] hover:text-[#ede6dd] focus-visible:outline-2 focus-visible:outline-[#e8b27d]"
                    >
                      ×
                    </button>
                  </li>
                )
              })}
            </ol>
            <p className="border-t border-white/[0.08] pt-2 text-xs leading-snug text-[#c9c0b6]">
              {t.brew.tally(found.length, totalMin)}
              {hidden > 0 ? ` · ${t.brew.hiddenTracks(hidden)}` : ''}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function MoveButton({label: aria, disabled, onClick, up = false}: {label: string; disabled: boolean; onClick: () => void; up?: boolean}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={aria}
      className="flex size-8 shrink-0 items-center justify-center rounded-md text-[#a79e94] transition enabled:hover:bg-white/[0.07] enabled:hover:text-[#ede6dd] disabled:opacity-25 focus-visible:outline-2 focus-visible:outline-[#e8b27d]"
    >
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden className={up ? '' : 'rotate-180'}>
        <path d="M1.5 6.5 5 3l3.5 3.5" />
      </svg>
    </button>
  )
}

// Nút + / ✓ thêm bài vào danh sách đang chọn. Dùng cả trong danh sách nhạc của quán
export function AddTrackButton({inList, title, full = false, onToggle}: {inList: boolean; title: string; full?: boolean; onToggle: () => void}) {
  const t = useT()
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={full}
      aria-pressed={inList}
      aria-label={inList ? t.brew.removeAria(title) : t.brew.addAria(title)}
      title={inList ? t.brew.removeAria(title) : t.brew.addAria(title)}
      className={`flex size-8 shrink-0 items-center justify-center rounded-lg border text-sm leading-none transition disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-[#e8b27d] ${
        inList ? 'border-[#e8b27d]/60 bg-[#e8b27d]/15 text-[#f3cfa8]' : 'border-white/10 text-[#c9c0b6] hover:border-[#e8b27d]/60 hover:text-[#f3cfa8]'
      }`}
    >
      {inList ? '✓' : '+'}
    </button>
  )
}
