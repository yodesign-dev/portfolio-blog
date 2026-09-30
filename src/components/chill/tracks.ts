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

export const TRACKS: Track[] = [
  // Lyria 3 (Google) qua Figma Weave — không lời, mỗi bài ~3 phút.
  // Trong mỗi trạm xếp xen kẽ bài nhanh / chậm để mix không bị đều đều.
  // ☕ Café Acoustic
  {
    id: 'acoustic-morning-letters',
    title: 'Morning Letters',
    mood: 'Acoustic guitar · Warm',
    duration: 178,
    src: '/chill/music/acoustic-morning-letters.m4a',
    station: 'acoustic',
  },
  {
    id: 'acoustic-sunday-window',
    title: 'Sunday Window',
    mood: 'Bossa folk · Sunny',
    duration: 174,
    src: '/chill/music/acoustic-sunday-window.m4a',
    station: 'acoustic',
  },
  {
    id: 'acoustic-old-polaroids',
    title: 'Old Polaroids',
    mood: 'Guitar & piano · Nostalgic',
    duration: 177,
    src: '/chill/music/acoustic-old-polaroids.m4a',
    station: 'acoustic',
  },
  {
    id: 'acoustic-evening-stroll',
    title: 'Evening Stroll',
    mood: 'Folk-pop · Uplifting',
    duration: 177,
    src: '/chill/music/acoustic-evening-stroll.m4a',
    station: 'acoustic',
  },
  {
    id: 'acoustic-rainy-veranda',
    title: 'Rainy Veranda',
    mood: 'Fingerstyle & cello · Rain',
    duration: 167,
    src: '/chill/music/acoustic-rainy-veranda.m4a',
    station: 'acoustic',
  },
  // 🎧 Deep Focus
  {
    id: 'focus-still-water',
    title: 'Still Water',
    mood: 'Ambient · Deep focus',
    duration: 176,
    src: '/chill/music/focus-still-water.m4a',
    station: 'focus',
  },
  {
    id: 'focus-glass-hours',
    title: 'Glass Hours',
    mood: 'Minimal synth · Flow',
    duration: 167,
    src: '/chill/music/focus-glass-hours.m4a',
    station: 'focus',
  },
  {
    id: 'focus-night-library',
    title: 'Night Library',
    mood: 'Piano & drone · Late night',
    duration: 175,
    src: '/chill/music/focus-night-library.m4a',
    station: 'focus',
  },
  {
    id: 'focus-cloud-drift',
    title: 'Cloud Drift',
    mood: 'Strings & pads · Bright',
    duration: 172,
    src: '/chill/music/focus-cloud-drift.m4a',
    station: 'focus',
  },
  // 🎷 Sax Lounge
  {
    id: 'sax-midnight-avenue',
    title: 'Midnight Avenue',
    mood: 'Smooth sax · Lounge',
    duration: 173,
    src: '/chill/music/sax-midnight-avenue.m4a',
    station: 'sax',
  },
  {
    id: 'sax-velvet-rooftop',
    title: 'Velvet Rooftop',
    mood: 'Bossa sax · Dusk',
    duration: 178,
    src: '/chill/music/sax-velvet-rooftop.m4a',
    station: 'sax',
  },
  {
    id: 'sax-late-taxi',
    title: 'Late Taxi',
    mood: 'Sax ballad · Midnight',
    duration: 180,
    src: '/chill/music/sax-late-taxi.m4a',
    station: 'sax',
  },
  {
    id: 'sax-neon-harbor',
    title: 'Neon Harbor',
    mood: 'Smooth jazz · Groove',
    duration: 180,
    src: '/chill/music/sax-neon-harbor.m4a',
    station: 'sax',
  },
  // CassetteAI / MiniMax — trạm Lo-fi
  {
    id: 'morning-phin',
    title: 'Morning Phin',
    mood: 'Rhodes · Warm',
    duration: 180,
    src: '/chill/music/morning-phin.m4a',
  },
  {
    id: 'hanoi-mist',
    title: 'Hanoi Morning Mist',
    mood: 'Ambient · Slow',
    duration: 180,
    src: '/chill/music/hanoi-mist.m4a',
  },
  {
    id: 'scooter-traffic',
    title: 'Scooter Traffic',
    mood: 'Jazz guitar · Focus',
    duration: 180,
    src: '/chill/music/scooter-traffic.m4a',
  },
  {
    id: 'rain-awning',
    title: 'Rain on the Awning',
    mood: 'Jazzy · Soft',
    duration: 180,
    src: '/chill/music/rain-awning.m4a',
  },
  {
    id: 'rainy-morning-beats',
    title: 'Rainy Morning Beats',
    mood: 'Lo-fi chill · MiniMax',
    duration: 75,
    src: '/chill/music/rainy-morning-beats.m4a',
  },
  {
    id: 'deep-work',
    title: 'Deep Work Loop',
    mood: 'Steady · Minimal',
    duration: 180,
    src: '/chill/music/deep-work.m4a',
  },
  // 📖 Study Beats — lo-fi hip hop để học / làm việc (Lyria 3 Pro qua Figma Weave),
  // 70–80 BPM, trống bụi + hợp âm jazz, không lời, không có đoạn lặng giữa bài
  {
    id: 'study-sunlit-desk',
    title: 'Sunlit Desk',
    mood: 'Rhodes & flute · Bright',
    duration: 174,
    src: '/chill/music/study-sunlit-desk.m4a',
    station: 'study',
  },
  {
    id: 'study-open-notebook',
    title: 'Open Notebook',
    mood: 'Rhodes · Dusty drums',
    duration: 174,
    src: '/chill/music/study-open-notebook.m4a',
    station: 'study',
  },
  {
    id: 'study-library-window',
    title: 'Library Window',
    mood: 'Felt piano · Deep work',
    duration: 177,
    src: '/chill/music/study-library-window.m4a',
    station: 'study',
  },
  {
    id: 'study-phin-drip-loop',
    title: 'Phin Drip Loop',
    mood: 'Jazz piano & guitar · Cozy',
    duration: 167,
    src: '/chill/music/study-phin-drip-loop.m4a',
    station: 'study',
  },
  {
    id: 'study-late-assignment',
    title: 'Late Assignment',
    mood: 'Muted guitar · Late night',
    duration: 175,
    src: '/chill/music/study-late-assignment.m4a',
    station: 'study',
  },
]
