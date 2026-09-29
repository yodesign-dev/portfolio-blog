// Playlist của trang /chill.
//
// Mỗi bài là 1 trong 2 loại:
// - `src`: file nhạc thật trong public/chill/music/ (AAC .m4a 128kbps).
//   5 bài hiện tại tạo bằng CassetteAI qua Figma Weave (bản tạm giai đoạn 1b).
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

export type Track = {
  id: string
  title: string
  mood: string
  // Thời lượng (giây) — bài synth hết giờ thì tự chuyển bài tiếp theo
  duration: number
  src?: string
  synth?: SynthSpec
}

export const TRACKS: Track[] = [
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
  {id: 'deep-work', title: 'Deep Work Loop', mood: 'Steady · Minimal', duration: 180, src: '/chill/music/deep-work.m4a'},
]
