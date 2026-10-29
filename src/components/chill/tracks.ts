// Playlist của trang /chill — quản lý trong Sanity Studio ("Chill · Nhạc"),
// file này chỉ còn kiểu dữ liệu, danh sách trạm và vài bài dự phòng.
//
// Mỗi bài là 1 trong 2 loại:
// - `src`: file nhạc thật trên Sanity CDN (AAC .m4a 128kbps), upload trong Studio.
//   Tạo bằng Lyria 3 / CassetteAI / MiniMax Music qua Figma Weave. Không để file
//   nhạc trong public/ — mỗi lần deploy Vercel lưu lại nguyên bộ, rất tốn storage.
// - `synth`: bài lo-fi tạo ngay trên trình duyệt bằng Web Audio — không cần
//   file, dùng khi muốn thêm bài mà chưa có nhạc (xem audio.ts).

export type SynthSpec = {
  bpm: number
  // Mỗi hợp âm là danh sách nốt MIDI (60 = C4), 1 hợp âm / ô nhịp
  chords: number[][]
  // 0–1: mật độ giai điệu, 0 = chỉ có hợp âm + trống
  melody: number
  drums: 'full' | 'soft' | 'none'
  // Tần số cắt của low-pass tổng — thấp = đục, ấm hơn
  tone: number
}

// Trạm nhạc theo mood — mỗi trạm phát liền mạch, các bài chồng mờ vào nhau. Trạm chưa có
// bài nào (hoặc mọi bài đang ẩn trong Studio) thì không hiện tab
export type StationId = 'acoustic' | 'focus' | 'night' | 'sax' | 'lofi' | 'study'

export const STATIONS: {id: StationId; label: string; short: string}[] = [
  {id: 'acoustic', label: 'Café Acoustic', short: 'Acoustic'},
  {id: 'focus', label: 'Deep Focus', short: 'Focus'},
  // Nhạc ngủ: bài dài ~8 phút (ghép 3 đoạn Lyria), không trống, êm, cuối bài nhỏ dần 60 giây
  {id: 'night', label: 'Night & Sleep', short: 'Sleep'},
  {id: 'sax', label: 'Sax Lounge', short: 'Sax'},
  {id: 'lofi', label: 'Lo-fi', short: 'Lo-fi'},
  {id: 'study', label: 'Study Beats', short: 'Study'},
]

export type Track = {
  id: string
  title: string
  mood: string
  // Thời lượng (giây) — bài synth hết giờ thì tự chuyển bài tiếp theo
  duration: number
  src?: string
  synth?: SynthSpec
  station?: StationId // bỏ trống = 'lofi'
}

export const stationOf = (t: Track): StationId => t.station ?? 'lofi'

// Dự phòng khi Sanity không trả về bài nào — playlist thật quản lý trong Studio
// ("Chill · Nhạc"). Mỗi trạm 1 bài, trỏ thẳng vào file trên Sanity CDN (CDN vẫn
// phục vụ file kể cả khi API truy vấn lỗi).
const CDN = 'https://cdn.sanity.io/files/9os2xcca/production/'
export const TRACKS: Track[] = [
  {
    id: 'acoustic-morning-letters',
    title: 'Morning Letters',
    mood: 'Acoustic guitar · Warm',
    duration: 178,
    src: `${CDN}ea7afec31971ded56e57899eead0ad03d36904a5.m4a`,
    station: 'acoustic',
  },
  {
    id: 'focus-still-water',
    title: 'Still Water',
    mood: 'Ambient · Deep focus',
    duration: 176,
    src: `${CDN}269e767bc08a528212fa8d19d3a1fa72a506f7ac.m4a`,
    station: 'focus',
  },
  {
    id: 'sax-midnight-avenue',
    title: 'Midnight Avenue',
    mood: 'Smooth sax · Lounge',
    duration: 173,
    src: `${CDN}1c1a8c6175c6859369f036d15e79665b2b3b98a2.m4a`,
    station: 'sax',
  },
  {
    id: 'morning-phin',
    title: 'Morning Phin',
    mood: 'Rhodes · Warm',
    duration: 180,
    src: `${CDN}46858768901ce86bdbb62d716b868f0dfc5f239e.m4a`,
  },
  {
    id: 'study-sunlit-desk',
    title: 'Sunlit Desk',
    mood: 'Rhodes & flute · Bright',
    duration: 174,
    src: `${CDN}58f6295d2eadbbb09309994c28a44b4fd3f59927.m4a`,
    station: 'study',
  },
]
