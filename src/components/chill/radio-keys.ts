// Phím mũi tên cho mọi nhóm role="radiogroup" trong quán (chọn người ngồi, phòng, điểm đến,
// trạm nhạc, thời lượng phin…): ← ↑ về lựa chọn trước, → ↓ sang lựa chọn sau, Home / End về
// đầu / cuối, vòng lại ở hai đầu. Lựa chọn mới được focus và bấm luôn, như radio gốc của trình
// duyệt. Lắng nghe ở pha bắt (capture) để phím tắt của trang (vd lật trang Nhật ký) không chạy
// trùng khi đang đứng trên một radio.

const KEYS: Record<string, number | 'first' | 'last'> = {ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1, Home: 'first', End: 'last'}

export function onRadioKey(e: KeyboardEvent) {
  const step = KEYS[e.key]
  if (step === undefined || e.altKey || e.ctrlKey || e.metaKey) return
  const target = e.target
  if (!(target instanceof HTMLElement) || target.getAttribute('role') !== 'radio') return
  const group = target.closest('[role="radiogroup"]')
  if (!group) return
  const radios = [...group.querySelectorAll<HTMLElement>('[role="radio"]')].filter(
    (r) => !r.hasAttribute('disabled') && r.getAttribute('aria-disabled') !== 'true' && r.getClientRects().length > 0,
  )
  const i = radios.indexOf(target)
  if (i < 0 || radios.length < 2) return
  const to = step === 'first' ? 0 : step === 'last' ? radios.length - 1 : (i + step + radios.length) % radios.length
  e.preventDefault()
  e.stopPropagation()
  const next = radios[to]
  next.focus()
  next.click()
}
