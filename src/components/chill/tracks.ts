// Playlist của trang /chill — quản lý trong Sanity Studio ("Chill · Nhạc"),
// file này chỉ còn kiểu dữ liệu, danh sách trạm và vài bài dự phòng.
//
// Mỗi bài là 1 trong 2 loại:
// - `src`: file nhạc thật trong public/chill/music/ (AAC .m4a 128kbps).
//   Tạo bằng Lyria 3 / CassetteAI / MiniMax Music qua Figma Weave.
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

// Trạm nhạc theo mood — mỗi trạm phát liền mạch, các bài chồng mờ vào nhau
export type StationId = 'acoustic' | 'focus' | 'sax' | 'lofi' | 'study'

export const STATIONS: {id: StationId; label: string; short: string}[] = [
  {id: 'acoustic', label: 'Café Acoustic', short: 'Acoustic'},
  {id: 'focus', label: 'Deep Focus', short: 'Focus'},
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
// ("Chill · Nhạc"). Mỗi trạm 1 bài, file nằm sẵn ở public/chill/music/.
export const TRACKS: Track[] = [
  {
    id: 'acoustic-morning-letters',
    title: 'Morning Letters',
    mood: 'Acoustic guitar · Warm',
    duration: 178,
    src: '/chill/music/acoustic-morning-letters.m4a',
    station: 'acoustic',
  },
  {
    id: 'focus-still-water',
    title: 'Still Water',
    mood: 'Ambient · Deep focus',
    duration: 176,
    src: '/chill/music/focus-still-water.m4a',
    station: 'focus',
  },
  {
    id: 'sax-midnight-avenue',
    title: 'Midnight Avenue',
    mood: 'Smooth sax · Lounge',
    duration: 173,
    src: '/chill/music/sax-midnight-avenue.m4a',
    station: 'sax',
  },
  {
    id: 'morning-phin',
    title: 'Morning Phin',
    mood: 'Rhodes · Warm',
    duration: 180,
    src: '/chill/music/morning-phin.m4a',
  },
  {
    id: 'study-sunlit-desk',
    title: 'Sunlit Desk',
    mood: 'Rhodes & flute · Bright',
    duration: 174,
    src: '/chill/music/study-sunlit-desk.m4a',
    station: 'study',
  },
]
