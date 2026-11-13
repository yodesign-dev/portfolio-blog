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
export type StationId = 'acoustic' | 'noel' | 'focus' | 'night' | 'sax' | 'throwback' | 'memories' | 'lofi' | 'study'

// `vi`: tên trạm khi trang ở tiếng Việt (thay cả label lẫn short). Bỏ trống = giữ tên tiếng Anh
export const STATIONS: {id: StationId; label: string; short: string; vi?: string}[] = [
  // Chỉ có bài trong mùa Noel (content.ts lọc theo lịch "Chill · Mùa"), ngoài mùa không hiện tab
  {id: 'noel', label: 'Christmas Café', short: 'Noel'},
  {id: 'acoustic', label: 'Café Acoustic', short: 'Acoustic'},
  {id: 'focus', label: 'Deep Focus', short: 'Focus'},
  // Nhạc ngủ: bài dài ~8 phút (ghép 3 đoạn Lyria), không trống, êm, cuối bài nhỏ dần 60 giây
  {id: 'night', label: 'Night & Sleep', short: 'Sleep'},
  {id: 'sax', label: 'Sax Lounge', short: 'Sax'},
  // Ballad / city pop đầu 2000s phối lofi, chỉ bài không lời — bài có lời sang trạm Memories
  {id: 'throwback', label: '2000s Throwback', short: '2000s'},
  // Bài hát đầu 2000s có lời (AI vocal). Toàn bài có lời nên không vào gợi ý của Bàn pha phin
  // (playlist.ts), và trong tab này bỏ nhãn "Có lời" ở từng bài (VOCAL_STATIONS)
  {id: 'memories', label: 'Memories', short: 'Memories', vi: 'Hoài niệm'},
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
  // Bài có giọng hát — quán không tự chọn bài này cho phiên tập trung
  vocals?: boolean
  // Upload chưa quá NEW_TRACK_DAYS ngày → nhãn "Mới" trong danh sách (content.ts tính phía server)
  isNew?: boolean
}

export const NEW_TRACK_DAYS = 7

export const stationOf = (t: Track): StationId => t.station ?? 'lofi'

// Tên trạm theo ngôn ngữ trang: `short` cho tab, `label` cho tên đầy đủ (màn hình khoá, cửa sổ nổi)
export function stationName(st: {label: string; short: string; vi?: string}, lang: string, kind: 'label' | 'short' = 'label'): string {
  return (lang === 'vi' && st.vi) || st[kind]
}

export function stationNameOf(id: StationId, lang: string, kind: 'label' | 'short' = 'label'): string {
  const st = STATIONS.find((s) => s.id === id)
  return st ? stationName(st, lang, kind) : ''
}

// Trạm mà bài nào cũng có lời: trong danh sách của trạm này, nhãn "Có lời" ở từng bài thành thừa
export const VOCAL_STATIONS: ReadonlySet<StationId> = new Set<StationId>(['memories'])

// Trạm mới mở: mọi bài trong trạm đều còn nhãn "Mới" (lên chưa quá NEW_TRACK_DAYS ngày). Tab trạm
// hiện chữ "Mới" thay cho chấm, và từng bài trong trạm bỏ nhãn "Mới" cho đỡ rối
export function newStations(tracks: Track[]): Set<StationId> {
  const out = new Set<StationId>()
  for (const t of tracks) if (t.isNew) out.add(stationOf(t))
  for (const t of tracks) if (!t.isNew) out.delete(stationOf(t))
  return out
}

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
