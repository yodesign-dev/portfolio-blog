'use client'

// "Buy Bin a coffee" — màn donate trong khung Wishlist trang /chill.
//
// 3 bước:
//   1. Để lại lời nhắn (không bắt buộc): mức tiền, tên, lời nhắn. Có điền thì lưu
//      ngay vào Studio ("Chờ đối chiếu") + mã riêng → người chuyển xong đóng trang
//      luôn thì Bin vẫn khớp được với sao kê qua nội dung "Chill cafe K7Q2 Minh".
//   2. Quét QR: Vietcombank (VietQR, điền sẵn số tiền + nội dung có mã) hoặc MoMo
//      (QR tĩnh, copy nội dung dán vào lời nhắn). Quay lại tab từ app ngân hàng →
//      nhắc bấm "I've sent it".
//   3. Cảm ơn: mèo gừ gừ, tim bay, ly cà phê của người mời hiện trên bàn cạnh lọ
//      tip. Ai bỏ qua bước 1 có thể để lại tên ở đây.
// Người mời chọn có hiện tên + lời nhắn trên bảng cảm ơn trong quán hay không —
// bảng chỉ cập nhật sau khi Bin đối chiếu và tick "Đã nhận tiền" trong Studio.
// Trang không biết tiền có về thật hay không (tài khoản cá nhân) — Bin tự đối chiếu.

import {useEffect, useRef, useState} from 'react'
import {trackEvent} from '@/lib/analytics'
import {DONATE, DONATE_TIERS, hasMomo, hasVcb, loadIntent, saveCup, saveIntent, shortVnd, vietQrUrl, type DonateIntent} from './donate-config'

type Method = 'vcb' | 'momo'
type Step = 'note' | 'pay' | 'thanks'

const vnd = (n: number) => `${n.toLocaleString('vi-VN')}đ`

// Nội dung chuyển khoản: bỏ dấu + ký tự lạ (nhiều ngân hàng không nhận), tối đa 30 ký tự
const plain = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^A-Za-z0-9 -]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 30)

const field =
  'w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-[#ede6dd] placeholder:text-[#8d857c] focus:border-[#e8b27d]/50 focus:outline-none'
const primary =
  'w-full rounded-full bg-[#e8b27d] py-3 font-semibold text-[#2a1a10] transition hover:bg-[#f0c294] disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e8b27d]'

async function post(body: Record<string, unknown>) {
  const res = await fetch('/api/chill-support', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)})
  const data = (await res.json()) as {id?: string; code?: string; error?: string}
  if (!res.ok) throw new Error(data.error ?? "Couldn't send, please try again.")
  return data
}

export function Donate({onThanks, context}: {onThanks: () => void; context: string}) {
  const methods: Method[] = [...(hasVcb() ? (['vcb'] as const) : []), ...(hasMomo() ? (['momo'] as const) : [])]
  const [step, setStep] = useState<Step>('note')
  const [intent, setIntent] = useState<DonateIntent | null>(null)
  const [resumed, setResumed] = useState(false)

  // Quay lại trang sau khi sang app ngân hàng → tiếp tục ở bước QR
  useEffect(() => {
    const saved = loadIntent()
    if (!saved) return
    /* eslint-disable react-hooks/set-state-in-effect */
    setIntent(saved)
    setStep('pay')
    setResumed(true)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [])

  const toPay = (next: DonateIntent) => {
    setIntent(next)
    saveIntent(next)
    setStep('pay')
    setResumed(false)
  }

  if (step === 'note' || !intent) return <NoteStep initial={intent} context={context} onNext={toPay} />
  if (step === 'pay')
    return (
      <PayStep
        intent={intent}
        methods={methods}
        context={context}
        resumed={resumed}
        onBack={() => setStep('note')}
        onSent={(id) => {
          setIntent({...intent, id})
          saveIntent(null)
          saveCup()
          setStep('thanks')
          onThanks()
        }}
      />
    )
  return <ThanksStep intent={intent} onBack={() => setStep('pay')} />
}

// ---------- Bước 1: lời nhắn (không bắt buộc) ----------

function NoteStep({initial, context, onNext}: {initial: DonateIntent | null; context: string; onNext: (i: DonateIntent) => void}) {
  const preset = DONATE_TIERS.some((t) => t.amount === initial?.amount)
  const [tier, setTier] = useState(preset ? initial!.amount : DONATE_TIERS[0].amount)
  const [custom, setCustom] = useState(initial && !preset && initial.amount ? String(initial.amount / 1000) : '')
  const [otherOpen, setOtherOpen] = useState(Boolean(custom))
  const [name, setName] = useState(initial?.name ?? '')
  const [message, setMessage] = useState(initial?.message ?? '')
  const [board, setBoard] = useState(initial?.board ?? true)
  const [company, setCompany] = useState('')
  const [busy, setBusy] = useState(false)
  const otherRef = useRef<HTMLInputElement>(null)

  const amount = otherOpen ? Number(custom || 0) * 1000 : tier
  const invite = otherOpen ? (amount ? `Mời Bin ${shortVnd(amount)}` : '') : (DONATE_TIERS.find((t) => t.amount === tier)?.invite ?? '')

  const next = async (withNote: boolean) => {
    const base = {name: withNote ? name.trim() : '', message: withNote ? message.trim() : '', amount, board: withNote && board, at: Date.now()}
    // Không để lại gì → khỏi tạo bản ghi, sang QR luôn
    if (!base.name && !base.message) return onNext({...base, id: initial?.id, code: initial?.code})
    // Đã có bản ghi từ lần trước (quay lại sửa) → giữ mã cũ
    if (initial?.id) return onNext({...base, id: initial.id, code: initial.code})
    setBusy(true)
    try {
      const {id, code} = await post({action: 'intent', ...base, method: 'vcb', context, company})
      onNext({...base, id, code})
    } catch {
      // Lỗi thì vẫn cho sang QR — ủng hộ quan trọng hơn bản ghi
      onNext(base)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
      <p className="text-[15px] leading-relaxed text-[#ede6dd]">Enjoying the café? Mời Bin một ly — every cup keeps the music playing and new features brewing. Scan with any Vietnamese bank app or MoMo, no card needed.</p>

      <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.2em] text-[#a79e94]">Step 1 of 2 · Mời Bin 1 ly</p>
      <div className="mt-2 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Amount">
        {DONATE_TIERS.map((t) => {
          const on = !otherOpen && tier === t.amount
          return (
            <button
              key={t.amount}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => {
                setTier(t.amount)
                setOtherOpen(false)
              }}
              className={`rounded-full border px-3 py-1.5 text-sm transition ${on ? 'border-[#e8b27d]/60 bg-[#e8b27d]/15 text-[#f3cfa8]' : 'border-white/10 text-[#c9c0b6] hover:text-[#ede6dd]'}`}
            >
              {t.icon} {t.label}
              {t.amount ? ` · ${shortVnd(t.amount)}` : ''}
            </button>
          )
        })}
        {otherOpen ? (
          <label className="flex items-center rounded-full border border-[#e8b27d]/60 bg-[#e8b27d]/15 px-3 text-sm">
            <input
              ref={otherRef}
              inputMode="numeric"
              value={custom}
              onChange={(e) => setCustom(e.target.value.replace(/\D/g, '').slice(0, 5))}
              placeholder="0"
              aria-label="Other amount, in thousand đồng"
              className="w-12 bg-transparent py-1.5 text-right text-[#f3cfa8] placeholder:text-[#8d857c] focus:outline-none"
            />
            <span className="text-[#c9c0b6]">.000đ</span>
          </label>
        ) : (
          <button
            type="button"
            role="radio"
            aria-checked={false}
            onClick={() => {
              setOtherOpen(true)
              setTimeout(() => otherRef.current?.focus(), 0)
            }}
            className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-[#c9c0b6] transition hover:text-[#ede6dd]"
          >
            ✏️ Other
          </button>
        )}
      </div>

      <p className="mt-5 text-sm font-semibold text-[#f3ece4]">Leave Bin a note?</p>
      <p className="mt-0.5 text-[11px] leading-relaxed text-[#8d857c]">Optional. Your name goes into the transfer note so Bin knows who to thank.</p>
      <div className="mt-2 space-y-2">
        <input value={name} onChange={(e) => setName(e.target.value.slice(0, 40))} placeholder="Your name" aria-label="Your name (optional)" className={field} />
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, 300))}
          rows={2}
          placeholder="A few words for Bin"
          aria-label="Message (optional)"
          className={`${field} resize-none`}
        />
        {(name.trim() || message.trim()) && <BoardCheck checked={board} onChange={setBoard} />}
        {/* Honeypot: người thật không thấy field này */}
        <input tabIndex={-1} autoComplete="off" aria-hidden value={company} onChange={(e) => setCompany(e.target.value)} className="absolute -left-[9999px] h-0 w-0 opacity-0" />
      </div>

      <button type="button" onClick={() => next(true)} disabled={busy} className={`mt-4 ${primary}`}>
        {busy ? 'One sec…' : invite ? `${invite} →` : 'Show the QR →'}
      </button>
      {(name || message) && (
        <button type="button" onClick={() => next(false)} className="mt-2 w-full text-center text-xs text-[#8d857c] underline-offset-4 hover:underline">
          Skip the note, just show the QR
        </button>
      )}
    </div>
  )
}

// ---------- Bước 2: quét QR ----------

function PayStep({
  intent,
  methods,
  context,
  resumed,
  onBack,
  onSent,
}: {
  intent: DonateIntent
  methods: Method[]
  context: string
  resumed: boolean
  onBack: () => void
  onSent: (id?: string) => void
}) {
  const [method, setMethod] = useState<Method>(methods[0] ?? 'vcb')
  const [copied, setCopied] = useState('')
  const [nudge, setNudge] = useState(resumed)
  const [busy, setBusy] = useState(false)
  const note = plain([DONATE.note, intent.code, intent.name].filter(Boolean).join(' '))
  const qr = hasVcb() ? vietQrUrl(intent.amount, note) : ''

  // Rời tab (sang app ngân hàng) rồi quay lại → nhắc bấm "I've sent it"
  useEffect(() => {
    let hiddenAt = 0
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') hiddenAt = Date.now()
      else if (hiddenAt && Date.now() - hiddenAt > 4000) setNudge(true)
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  const copy = (label: string, value: string) => {
    void navigator.clipboard?.writeText(value).then(() => {
      setCopied(label)
      setTimeout(() => setCopied(''), 1500)
    })
  }

  const sent = async () => {
    if (busy) return
    setBusy(true)
    trackEvent({name: 'Chill Donate Thanks', props: {method}})
    let id = intent.id
    try {
      ;({id} = await post({action: 'sent', id: intent.id, method, amount: intent.amount, name: intent.name, board: intent.board, note, context}))
    } catch {
      // Ghi nhận lỗi cũng không chặn lời cảm ơn
    }
    setBusy(false)
    onSent(id)
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#a79e94]">Step 2 of 2 · Scan to send</p>
        <button type="button" onClick={onBack} className="text-xs text-[#c9c0b6] underline-offset-4 hover:underline">
          ← Edit
        </button>
      </div>

      {nudge && (
        <p role="status" className="mt-3 rounded-xl border border-[#e8b27d]/40 bg-[#e8b27d]/10 px-3 py-2 text-sm text-[#f3cfa8]">
          Back from your bank app? Tap <span className="font-semibold">“I&apos;ve sent it”</span> so Bin can thank you 💛
        </p>
      )}

      {methods.length > 1 && (
        <div className="mt-3 grid grid-cols-2 gap-1 rounded-full border border-white/10 bg-black/20 p-1" role="tablist" aria-label="Payment method">
          {methods.map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={method === m}
              onClick={() => setMethod(m)}
              className={`rounded-full py-1.5 text-sm font-semibold transition ${
                method === m ? (m === 'momo' ? 'bg-[#a50064] text-white' : 'bg-[#007b40] text-white') : 'text-[#a79e94] hover:text-[#ede6dd]'
              }`}
            >
              {m === 'momo' ? 'MoMo' : 'Vietcombank'}
            </button>
          ))}
        </div>
      )}

      {method === 'vcb' && hasVcb() && (
        <div className="mt-4 flex gap-4">
          <a href={qr} target="_blank" rel="noopener" title="Open the QR (to save it on your phone)" className="shrink-0 rounded-2xl bg-white p-2 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.8)]">
            {/* eslint-disable-next-line @next/next/no-img-element -- ảnh QR động từ img.vietqr.io */}
            <img src={qr} alt={`Vietcombank VietQR${intent.amount ? `, ${vnd(intent.amount)}` : ''}`} width={148} height={148} className="h-[148px] w-[148px]" />
          </a>
          <dl className="min-w-0 flex-1 space-y-1.5 text-sm">
            <Row label="Bank" value="Vietcombank" />
            <Row label="Account" value={DONATE.vcb.account} onCopy={() => copy('account', DONATE.vcb.account)} copied={copied === 'account'} mono />
            <Row label="Name" value={DONATE.vcb.name} />
            <Row label="Amount" value={intent.amount ? vnd(intent.amount) : 'You choose'} />
            <Row label="Note" value={note} onCopy={() => copy('note', note)} copied={copied === 'note'} mono />
          </dl>
        </div>
      )}

      {method === 'momo' && hasMomo() && (
        <div className="mt-4 flex gap-4">
          <div className="shrink-0 rounded-2xl bg-white p-2 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.8)]">
            {/* eslint-disable-next-line @next/next/no-img-element -- ảnh QR tĩnh */}
            <img src={DONATE.momo.qr} alt="MoMo QR" width={148} height={148} className="h-[148px] w-[148px] object-contain" />
          </div>
          <div className="min-w-0 flex-1 space-y-2 text-sm">
            <dl className="space-y-1.5">
              {DONATE.momo.name && <Row label="Name" value={DONATE.momo.name} />}
              <Row label="Note" value={note} onCopy={() => copy('note', note)} copied={copied === 'note'} mono />
            </dl>
            <p className="text-[11px] leading-relaxed text-[#8d857c]">Type the amount{intent.amount ? ` (${vnd(intent.amount)})` : ''} and paste the note into the MoMo message.</p>
            <a href={DONATE.momo.qr} download="bin-momo-qr.webp" className="inline-block text-xs text-[#f3cfa8] underline-offset-4 hover:underline">
              Save QR
            </a>
          </div>
        </div>
      )}

      <p className="mt-3 text-[11px] leading-relaxed text-[#8d857c]">
        Works with any Vietnamese banking app. On your phone? Tap the QR to open it, save it, then pick it from your bank app&apos;s QR scanner — come back here after.
      </p>

      <button type="button" onClick={sent} disabled={busy} className={`mt-4 ${primary} ${nudge ? 'ring-2 ring-[#e8b27d]/60 ring-offset-2 ring-offset-[#1b1a21]' : ''}`}>
        I&apos;ve sent it 💛
      </button>
    </div>
  )
}

// ---------- Bước 3: cảm ơn ----------

function ThanksStep({intent, onBack}: {intent: DonateIntent; onBack: () => void}) {
  const askName = !intent.name && Boolean(intent.id)
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [board, setBoard] = useState(true)
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle')
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setState('sending')
    setError('')
    try {
      await post({action: 'update', id: intent.id, name, message, board})
      setState('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send, please try again.")
      setState('idle')
    }
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-8 text-center">
      <p className="text-4xl" aria-hidden>
        ☕💛
      </p>
      <p className="mt-3 text-xl font-semibold tracking-tight text-[#f3ece4]">Cảm ơn {intent.name || 'bạn'} nhiều!</p>
      <p className="mt-2 text-sm leading-relaxed text-[#a79e94]">Your coffee keeps the lights on and new things brewing at the café. The cat says thanks too 🐾</p>
      <p className="mt-2 text-sm leading-relaxed text-[#a79e94]">
        Your cup is on the table next to the tip jar ☕{' '}
        {intent.board && intent.name ? 'Your name goes up on the thank-you board once Bin checks the transfer.' : ''}
      </p>

      {askName && state !== 'done' && (
        <form onSubmit={submit} className="mt-6 space-y-2 rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-left">
          <p className="text-sm font-semibold text-[#f3ece4]">Want Bin to know it was you?</p>
          <input value={name} onChange={(e) => setName(e.target.value.slice(0, 40))} placeholder="Your name" aria-label="Your name (optional)" className={field} />
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, 300))}
            rows={2}
            placeholder="A few words for Bin"
            aria-label="Message (optional)"
            className={`${field} resize-none`}
          />
          <BoardCheck checked={board} onChange={setBoard} />
          {error && (
            <p role="alert" className="text-sm text-rose-300">
              {error}
            </p>
          )}
          <button type="submit" disabled={state === 'sending' || (!name.trim() && !message.trim())} className={`${primary} py-2.5 text-sm`}>
            {state === 'sending' ? 'Sending…' : 'Send note'}
          </button>
        </form>
      )}
      {state === 'done' && (
        <p role="status" className="mt-6 rounded-2xl bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
          Note sent — Bin will see it with his coffee ☕
        </p>
      )}

      <button type="button" onClick={onBack} className="mt-4 text-xs text-[#8d857c] underline-offset-4 hover:underline">
        Back to the QR
      </button>
    </div>
  )
}

function Row({label, value, onCopy, copied, mono}: {label: string; value: string; onCopy?: () => void; copied?: boolean; mono?: boolean}) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="shrink-0 font-mono text-[10px] uppercase tracking-[0.15em] text-[#8d857c]">{label}</dt>
      <dd className="flex min-w-0 items-baseline gap-1.5">
        <span className={`truncate text-[#ede6dd] ${mono ? 'font-mono text-[13px]' : ''}`}>{value}</span>
        {onCopy && (
          <button type="button" onClick={onCopy} className="shrink-0 text-[11px] text-[#e8b27d] hover:underline" aria-label={`Copy ${label.toLowerCase()}`}>
            {copied ? 'Copied' : 'Copy'}
          </button>
        )}
      </dd>
    </div>
  )
}

// Đồng ý hiện tên + lời nhắn trên bảng cảm ơn (tấm bảng gỗ cạnh lọ tip trong quán)
function BoardCheck({checked, onChange}: {checked: boolean; onChange: (v: boolean) => void}) {
  return (
    <label className="flex cursor-pointer items-start gap-2 pt-1 text-left text-xs leading-relaxed text-[#c9c0b6]">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-[#e8b27d]" />
      <span>
        Pin my name &amp; note on the café&apos;s thank-you board
        <span className="block text-[11px] text-[#8d857c]">Goes up after Bin confirms the transfer. The amount is never shown.</span>
      </span>
    </label>
  )
}
