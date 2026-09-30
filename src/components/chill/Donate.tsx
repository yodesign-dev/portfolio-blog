'use client'

// "Buy Bin a coffee" — màn donate trong khung Wishlist trang /chill.
// QR MoMo (ảnh tĩnh) + QR Vietcombank (VietQR, điền sẵn số tiền + nội dung).
// Không có cách tự biết tiền đã tới (tài khoản cá nhân) → nút "Mình đã chuyển"
// chạy theo kiểu tin người xem: cảm ơn + mèo gừ gừ, tim bay, rồi mời để lại tên /
// số tiền / lời nhắn (không bắt buộc) → lưu vào Studio "Chill · Supporters".

import {useEffect, useState} from 'react'
import {trackEvent} from '@/lib/analytics'
import {DONATE, DONATE_TIERS, hasMomo, hasVcb, vietQrUrl} from './donate-config'

type Method = 'vcb' | 'momo'

const vnd = (n: number) => `${n.toLocaleString('vi-VN')}đ`

// Nội dung chuyển khoản: bỏ dấu + ký tự lạ (nhiều ngân hàng không nhận), tối đa 25 ký tự
const plain = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^A-Za-z0-9 -]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

export function Donate({onThanks, context}: {onThanks: () => void; context: string}) {
  const methods: Method[] = [...(hasVcb() ? (['vcb'] as const) : []), ...(hasMomo() ? (['momo'] as const) : [])]
  const [method, setMethod] = useState<Method>(methods[0] ?? 'vcb')
  const [tier, setTier] = useState<number>(DONATE_TIERS[0].amount)
  const [custom, setCustom] = useState('')
  const [name, setName] = useState('')
  const [thanked, setThanked] = useState(false)
  const [copied, setCopied] = useState('')

  const amount = custom ? Number(custom.replace(/\D/g, '')) * 1000 : tier
  const note = plain(name ? `${DONATE.note} - ${name}` : DONATE.note).slice(0, 25)
  // QR đổi chậm lại một nhịp khi đang gõ số tiền / tên, khỏi tải ảnh mỗi phím
  const [qr, setQr] = useState(() => (hasVcb() ? vietQrUrl(amount, note) : ''))
  useEffect(() => {
    if (!hasVcb()) return
    const id = setTimeout(() => setQr(vietQrUrl(amount, note)), 450)
    return () => clearTimeout(id)
  }, [amount, note])

  const copy = (label: string, value: string) => {
    void navigator.clipboard?.writeText(value).then(() => {
      setCopied(label)
      setTimeout(() => setCopied(''), 1500)
    })
  }

  const thanks = () => {
    setThanked(true)
    onThanks()
    trackEvent({name: 'Chill Donate Thanks', props: {method}})
  }

  if (thanked) {
    return (
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-8 text-center">
        <p className="text-4xl" aria-hidden>
          ☕💛
        </p>
        <p className="mt-3 text-xl font-semibold tracking-tight text-[#f3ece4]">Cảm ơn bạn nhiều!</p>
        <p className="mt-2 text-sm leading-relaxed text-[#a79e94]">
          Your coffee keeps the lights on and new things brewing at the café. The cat says thanks too 🐾
        </p>
        <ThanksNote method={method} amount={amount} name={name} note={note} context={context} />
        <button type="button" onClick={() => setThanked(false)} className="mt-4 text-xs text-[#8d857c] underline-offset-4 hover:underline">
          Back to the QR
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
      <p className="text-[15px] leading-relaxed text-[#ede6dd]">
        Enjoying the café? Buy Bin a coffee — every cup keeps the music playing and new features brewing.
      </p>

      {methods.length > 1 && (
        <div className="mt-4 grid grid-cols-2 gap-1 rounded-full border border-white/10 bg-black/20 p-1" role="tablist" aria-label="Payment method">
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
        <>
          <div className="mt-4 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Amount">
            {DONATE_TIERS.map((t) => (
              <button
                key={t.amount}
                type="button"
                role="radio"
                aria-checked={!custom && tier === t.amount}
                onClick={() => {
                  setTier(t.amount)
                  setCustom('')
                }}
                className={`rounded-full border px-3 py-1.5 text-sm transition ${
                  !custom && tier === t.amount ? 'border-[#e8b27d]/60 bg-[#e8b27d]/15 text-[#f3cfa8]' : 'border-white/10 text-[#c9c0b6] hover:text-[#ede6dd]'
                }`}
              >
                {t.icon} {t.label}
                {t.amount ? ` · ${vnd(t.amount)}` : ''}
              </button>
            ))}
            <label className={`flex items-center rounded-full border px-3 text-sm ${custom ? 'border-[#e8b27d]/60 bg-[#e8b27d]/15' : 'border-white/10'}`}>
              <input
                inputMode="numeric"
                value={custom}
                onChange={(e) => setCustom(e.target.value.replace(/\D/g, '').slice(0, 5))}
                placeholder="Other"
                aria-label="Other amount, in thousand đồng"
                className="w-14 bg-transparent py-1.5 text-[#f3cfa8] placeholder:text-[#8d857c] focus:outline-none"
              />
              <span className="text-[#8d857c]">.000đ</span>
            </label>
          </div>

          <p className="mt-2 text-xs text-[#a79e94]">Any amount is lovely — even a sip ☕</p>

          <div className="mt-4 flex gap-4">
            <a
              href={qr}
              target="_blank"
              rel="noopener"
              title="Open the QR (to save it on your phone)"
              className="shrink-0 rounded-2xl bg-white p-2 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.8)]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- ảnh QR động từ img.vietqr.io */}
              <img src={qr} alt={`Vietcombank VietQR, ${vnd(amount)}`} width={148} height={148} className="h-[148px] w-[148px]" />
            </a>
            <dl className="min-w-0 flex-1 space-y-1.5 text-sm">
              <Row label="Bank" value="Vietcombank" />
              <Row label="Account" value={DONATE.vcb.account} onCopy={() => copy('account', DONATE.vcb.account)} copied={copied === 'account'} mono />
              <Row label="Name" value={DONATE.vcb.name} />
              <Row label="Amount" value={amount ? vnd(amount) : 'You choose'} />
              <Row label="Note" value={note} onCopy={() => copy('note', note)} copied={copied === 'note'} mono />
            </dl>
          </div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 16))}
            placeholder="Your name in the note (optional)"
            aria-label="Your name, added to the transfer note (optional)"
            className="mt-3 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-[#ede6dd] placeholder:text-[#8d857c] focus:border-[#e8b27d]/50 focus:outline-none"
          />
          <p className="mt-2 text-[11px] leading-relaxed text-[#8d857c]">
            Scan with any Vietnamese banking app (or MoMo). On your phone? Tap the QR to open it, save it, then pick it from your bank app&apos;s QR scanner.
          </p>
        </>
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
              {DONATE.momo.phone && (
                <Row label="Phone" value={DONATE.momo.phone} onCopy={() => copy('phone', DONATE.momo.phone.replace(/\s/g, ''))} copied={copied === 'phone'} mono />
              )}
            </dl>
            <p className="text-[11px] leading-relaxed text-[#8d857c]">Scan with MoMo or any banking app, then type any amount you like. On your phone, save the QR and scan it from your gallery.</p>
            <a href={DONATE.momo.qr} download="bin-momo-qr.webp" className="inline-block text-xs text-[#f3cfa8] underline-offset-4 hover:underline">
              Save QR
            </a>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={thanks}
        className="mt-5 w-full rounded-full bg-[#e8b27d] py-3 font-semibold text-[#2a1a10] transition hover:bg-[#f0c294] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e8b27d]"
      >
        I&apos;ve sent it 💛
      </button>
    </div>
  )
}

// Để lại tên / số tiền / lời nhắn cho Bin sau khi chuyển (đều không bắt buộc)
function ThanksNote({method, amount, name, note, context}: {method: Method; amount: number; name: string; note: string; context: string}) {
  const [who, setWho] = useState(name)
  const [sent, setSent] = useState(amount ? String(amount / 1000) : '')
  const [message, setMessage] = useState('')
  const [company, setCompany] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle')
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (state === 'sending') return
    setState('sending')
    setError('')
    try {
      const res = await fetch('/api/chill-support', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({name: who, amount: Number(sent || 0) * 1000, method, note, message, context, company}),
      })
      const data = (await res.json()) as {error?: string}
      if (!res.ok) throw new Error(data.error ?? "Couldn't send, please try again.")
      setState('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send, please try again.")
      setState('idle')
    }
  }

  if (state === 'done') {
    return (
      <p role="status" className="mt-6 rounded-2xl bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
        Note sent — Bin will see it with his coffee ☕
      </p>
    )
  }

  const field =
    'w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-[#ede6dd] placeholder:text-[#8d857c] focus:border-[#e8b27d]/50 focus:outline-none'
  return (
    <form onSubmit={submit} className="mt-6 space-y-2 rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-left">
      <p className="text-sm font-semibold text-[#f3ece4]">Leave Bin a note?</p>
      <p className="text-[11px] text-[#8d857c]">Optional — so he knows who to thank. Only Bin sees it.</p>
      <div className="grid grid-cols-[minmax(0,1fr)_8rem] gap-2">
        <input value={who} onChange={(e) => setWho(e.target.value.slice(0, 40))} placeholder="Your name" aria-label="Your name (optional)" className={field} />
        <label className={`flex items-center gap-1 ${field}`}>
          <input
            inputMode="numeric"
            value={sent}
            onChange={(e) => setSent(e.target.value.replace(/\D/g, '').slice(0, 5))}
            placeholder="Amount"
            aria-label="Amount you sent, in thousand đồng (optional)"
            className="w-full min-w-0 bg-transparent focus:outline-none"
          />
          <span className="shrink-0 text-[#8d857c]">.000đ</span>
        </label>
      </div>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value.slice(0, 300))}
        rows={2}
        placeholder="A few words for Bin"
        aria-label="Message (optional)"
        className={`${field} resize-none`}
      />
      {/* Honeypot: người thật không thấy field này */}
      <input tabIndex={-1} autoComplete="off" aria-hidden value={company} onChange={(e) => setCompany(e.target.value)} className="absolute -left-[9999px] h-0 w-0 opacity-0" />
      {error && (
        <p role="alert" className="text-sm text-rose-300">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={state === 'sending' || (!who.trim() && !sent && !message.trim())}
        className="w-full rounded-full bg-[#e8b27d] py-2.5 text-sm font-semibold text-[#2a1a10] transition hover:bg-[#f0c294] disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e8b27d]"
      >
        {state === 'sending' ? 'Sending…' : 'Send note'}
      </button>
    </form>
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
