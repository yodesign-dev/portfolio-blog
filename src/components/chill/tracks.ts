// Playlist của trang /chill.
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
export type StationId = 'acoustic' | 'focus' | 'sax' | 'lofi'

export const STATIONS: {id: StationId; label: string; short: string}[] = [
  {id: 'acoustic', label: 'Café Acoustic', short: 'Acoustic'},
  {id: 'focus', label: 'Deep Focus', short: 'Focus'},
  {id: 'sax', label: 'Sax Lounge', short: 'Sax'},
  {id: 'lofi', label: 'Lo-fi', short: 'Lo-fi'},
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

export const TRACKS: Track[] = [
  // Lyria 3 (Google) qua Figma Weave — không lời, mỗi bài ~3 phút
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
  // CassetteAI / MiniMax — trạm Lo-fi
  {id: 'morning-phin', title: 'Morning Phin', mood: 'Rhodes · Warm', duration: 180, src: '/chill/music/morning-phin.m4a'},
  {id: 'hanoi-mist', title: 'Hanoi Morning Mist', mood: 'Ambient · Slow', duration: 180, src: '/chill/music/hanoi-mist.m4a'},
  {
    id: 'scooter-traffic',
    title: 'Scooter Traffic',
    mood: 'Jazz guitar · Focus',
    duration: 180,
    src: '/chill/music/scooter-traffic.m4a',
  },
  {id: 'rain-awning', title: 'Rain on the Awning', mood: 'Jazzy · Soft', duration: 180, src: '/chill/music/rain-awning.m4a'},
  {
    id: 'rainy-morning-beats',
    title: 'Rainy Morning Beats',
    mood: 'Lo-fi chill · MiniMax',
    duration: 75,
    src: '/chill/music/rainy-morning-beats.m4a',
  },
  {id: 'deep-work', title: 'Deep Work Loop', mood: 'Steady · Minimal', duration: 180, src: '/chill/music/deep-work.m4a'},
]
