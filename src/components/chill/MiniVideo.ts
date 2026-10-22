// Cửa sổ nổi dạng video cho trình duyệt không có Document PiP (Safari máy tính + iPad — xem
// MiniPlayer.tsx cho bản Chrome / Edge). Safari chỉ thả nổi được 1 thẻ <video>, nên:
//
// - Canvas nhỏ 640×360 chép cảnh từ canvas gốc + vẽ tên bài, trạm, dấu tạm dừng lên khung
// - canvas.captureStream() → <video muted> ẩn trong trang → requestPictureInPicture()
// - Nút trong cửa sổ là nút hệ thống: phát/dừng (sự kiện play/pause của video) và bài
//   trước/tiếp (Media Session, đặt sẵn trong ChillRoom) — không có danh sách, không đổi trạm
// - Nhạc vẫn phát từ trang, video câm
// - Canvas gốc phải "sạch" (ảnh Sanity tải kèm CORS, xem loadImage trong scene.ts); bẩn thì
//   captureStream ném lỗi → open() trả false
// - Tab ẩn: rAF đứng nên vòng vẽ chạy bằng setInterval — Safari có thể giãn nhịp, cảnh chậm
//   lại nhưng nhạc và tên bài vẫn đúng

const W = 640
const H = 360
const FPS = 30

type PiPVideo = HTMLVideoElement & {
  webkitSupportsPresentationMode?: (mode: string) => boolean
  webkitSetPresentationMode?: (mode: string) => void
  webkitPresentationMode?: string
}

export const canVideoPiP = () => {
  if (typeof document === 'undefined') return false
  const v = document.createElement('video') as PiPVideo
  return (
    (document.pictureInPictureEnabled && typeof v.requestPictureInPicture === 'function') ||
    (typeof v.webkitSupportsPresentationMode === 'function' && v.webkitSupportsPresentationMode('picture-in-picture'))
  )
}

export type MiniVideoInfo = {title: string; station: string; playing: boolean}

export class MiniVideo {
  // Cửa sổ nổi đóng (nút X / nút đưa về tab của hệ thống)
  onClose: (() => void) | null = null
  // Khách bấm phát / dừng trong cửa sổ nổi
  onToggle: (() => void) | null = null

  private canvas: HTMLCanvasElement | null = null
  private video: PiPVideo | null = null
  private timer = 0
  private open = false
  private syncing = false
  private info: MiniVideoInfo = {title: '', station: '', playing: false}
  private font = 'sans-serif'
  private idleUntil = 0

  constructor(
    private source: {current: HTMLCanvasElement | null},
    private draw: {current: (now: number) => boolean},
  ) {}

  get isOpen() {
    return this.open
  }

  // Dựng sẵn canvas + video trước khi bấm (rê chuột / chạm vào nút): Safari chỉ cho mở cửa
  // sổ nổi ngay trong thao tác bấm, lúc đó video phải có khung hình rồi. false = canvas bẩn
  prepare(): boolean {
    if (this.video) {
      if (!this.open) this.idle()
      return true
    }
    const canvas = document.createElement('canvas')
    canvas.width = W
    canvas.height = H
    this.canvas = canvas
    this.font = getComputedStyle(document.body).fontFamily || 'sans-serif'
    this.idleUntil = performance.now() + 10_000
    this.paint(performance.now())
    let stream: MediaStream
    try {
      stream = canvas.captureStream(FPS)
    } catch {
      this.canvas = null
      return false
    }
    // Khung đầu tiên của stream — có nó video mới báo loadedmetadata
    this.paint(performance.now() + 1)
    const video = document.createElement('video') as PiPVideo
    video.muted = true
    video.playsInline = true
    video.autoplay = true
    video.setAttribute('aria-hidden', 'true')
    video.style.cssText = 'position:fixed;left:0;bottom:0;width:2px;height:2px;opacity:0;pointer-events:none'
    video.srcObject = stream
    document.body.append(video)
    void video.play().catch(() => {})
    video.addEventListener('leavepictureinpicture', this.closed)
    video.addEventListener('webkitpresentationmodechanged', () => {
      if (video.webkitPresentationMode !== 'picture-in-picture') this.closed()
    })
    video.addEventListener('pause', this.pressed)
    video.addEventListener('play', this.pressed)
    this.video = video
    this.idle()
    return true
  }

  // Gọi trong thao tác bấm của khách
  async show(): Promise<boolean> {
    if (!this.prepare()) return false
    const video = this.video!
    // Chưa kịp rê chuột (bấm bằng bàn phím / chạm) → chờ khung đầu. Chrome vẫn cho mở trong
    // vài giây sau cú bấm; Safari có thể từ chối, bấm lần nữa là được
    if (video.readyState < HTMLMediaElement.HAVE_METADATA) {
      await new Promise((resolve) => {
        video.addEventListener('loadedmetadata', resolve, {once: true})
        window.setTimeout(resolve, 2000)
      })
    }
    try {
      if (typeof video.requestPictureInPicture === 'function') await video.requestPictureInPicture()
      else video.webkitSetPresentationMode?.('picture-in-picture')
    } catch {
      return false
    }
    this.open = true
    this.loop(FPS)
    return true
  }

  close() {
    if (!this.open) return
    if (document.pictureInPictureElement === this.video) void document.exitPictureInPicture().catch(() => {})
    else this.video?.webkitSetPresentationMode?.('inline')
  }

  update(info: MiniVideoInfo, onToggle: () => void) {
    this.info = info
    this.onToggle = onToggle
    const video = this.video
    if (!video) return
    // Đồng bộ nút phát/dừng của hệ thống với nhạc — không coi là khách bấm
    if (this.open && info.playing === video.paused) {
      this.syncing = true
      if (info.playing) void video.play().catch(() => {})
      else video.pause()
      queueMicrotask(() => (this.syncing = false))
    }
  }

  destroy() {
    this.close()
    window.clearInterval(this.timer)
    const video = this.video
    if (video) {
      ;(video.srcObject as MediaStream | null)?.getTracks().forEach((t) => t.stop())
      video.srcObject = null
      video.remove()
    }
    this.video = null
    this.canvas = null
    this.open = false
  }

  private closed = () => {
    if (!this.open) return
    this.open = false
    window.clearInterval(this.timer)
    // Video phải chạy tiếp để lần mở sau có khung hình ngay
    void this.video?.play().catch(() => {})
    this.onClose?.()
  }

  private pressed = () => {
    if (!this.open || this.syncing || !this.video) return
    if (this.video.paused === !this.info.playing) return
    this.onToggle?.()
  }

  // Chờ khách bấm: vẽ thưa để video luôn có khung mới (Safari bỏ qua stream đứng hình),
  // 10 giây không mở thì thôi — rê chuột lại vào nút là chạy tiếp
  private idle() {
    this.idleUntil = performance.now() + 10_000
    this.loop(4)
  }

  private loop(fps: number) {
    window.clearInterval(this.timer)
    this.timer = window.setInterval(() => this.paint(performance.now()), 1000 / fps)
  }

  private paint(now: number) {
    const canvas = this.canvas
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    if (!this.open && now > this.idleUntil) {
      window.clearInterval(this.timer)
      return
    }
    // Đang mở: cửa sổ nổi tự đẩy cảnh đi (rAF của tab gốc đứng khi tab ẩn)
    if (this.open) this.draw.current(now)
    const src = this.source.current
    ctx.fillStyle = '#16131a'
    ctx.fillRect(0, 0, W, H)
    if (src?.width) {
      const k = Math.max(W / src.width, H / src.height)
      const sw = W / k
      const sh = H / k
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(src, (src.width - sw) / 2, (src.height - sh) / 2, sw, sh, 0, 0, W, H)
    }
    // Dải tối dưới đáy cho chữ: tên bài + trạm · điểm đến
    const g = ctx.createLinearGradient(0, H - 110, 0, H)
    g.addColorStop(0, 'rgba(0,0,0,0)')
    g.addColorStop(1, 'rgba(0,0,0,0.72)')
    ctx.fillStyle = g
    ctx.fillRect(0, H - 110, W, 110)
    const {title, station, playing} = this.info
    ctx.textBaseline = 'alphabetic'
    ctx.fillStyle = 'rgba(232,178,125,0.95)'
    ctx.font = `600 15px ${this.font}`
    ctx.fillText(station.toUpperCase(), 22, H - 50, W - 44)
    ctx.fillStyle = '#f3ece4'
    ctx.font = `600 26px ${this.font}`
    ctx.fillText(title, 22, H - 20, W - 44)
    if (!playing) {
      // Dấu tạm dừng giữa khung
      ctx.fillStyle = 'rgba(0,0,0,0.45)'
      ctx.beginPath()
      ctx.arc(W / 2, H / 2 - 14, 34, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#f3ece4'
      ctx.fillRect(W / 2 - 12, H / 2 - 30, 8, 32)
      ctx.fillRect(W / 2 + 4, H / 2 - 30, 8, 32)
    }
  }
}
