// Playlist của trang /chill.
//
// Mỗi bài là 1 trong 2 loại:
// - `src`: file mp3 thật (nhạc làm bằng Suno/Udio…) — bỏ file vào
//   public/chill/music/ rồi thêm 1 dòng như ví dụ đang comment bên dưới.
// - `synth`: bài lo-fi tạo ngay trên trình duyệt bằng Web Audio (bản tạm
//   giai đoạn 1, chưa cần file nào). Có mp3 rồi thì xoá dần các bài này.

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
  // {
  //   id: 'morning-phin',
  //   title: 'Morning Phin',
  //   mood: 'Piano · Warm',
  //   duration: 184,
  //   src: '/chill/music/morning-phin.mp3',
  // },
  {
    id: 'phin-drip',
    title: 'Phin Drip',
    mood: 'Rhodes · Warm',
    duration: 180,
    synth: {
      bpm: 72,
      chords: [
        [53, 57, 60, 64], // Fmaj7
        [52, 55, 59, 62], // Em7
        [50, 53, 57, 60], // Dm7
        [48, 52, 55, 59], // Cmaj7
      ],
      melody: 0.35,
      drums: 'full',
      tone: 2600,
    },
  },
  {
    id: 'hanoi-mist',
    title: 'Hanoi Morning Mist',
    mood: 'Ambient · Slow',
    duration: 200,
    synth: {
      bpm: 62,
      chords: [
        [57, 60, 64, 71], // Am9
        [53, 57, 60, 64], // Fmaj7
        [48, 52, 55, 59], // Cmaj7
        [55, 59, 62, 64], // G6
      ],
      melody: 0.2,
      drums: 'none',
      tone: 1800,
    },
  },
  {
    id: 'scooter-traffic',
    title: 'Scooter Traffic',
    mood: 'Boom bap · Focus',
    duration: 170,
    synth: {
      bpm: 84,
      chords: [
        [50, 53, 57, 60, 64], // Dm9
        [55, 59, 64, 65], // G13
        [48, 52, 55, 59, 62], // Cmaj9
        [57, 61, 65, 67], // A7b13
      ],
      melody: 0.45,
      drums: 'full',
      tone: 3000,
    },
  },
  {
    id: 'rain-awning',
    title: 'Rain on the Awning',
    mood: 'Jazzy · Soft',
    duration: 190,
    synth: {
      bpm: 66,
      chords: [
        [51, 55, 58, 62], // Ebmaj7
        [48, 51, 55, 58, 62], // Cm9
        [44, 48, 51, 55], // Abmaj7
        [46, 51, 53, 56], // Bb7sus
      ],
      melody: 0.3,
      drums: 'soft',
      tone: 2000,
    },
  },
  {
    id: 'deep-work',
    title: 'Deep Work Loop',
    mood: 'Steady · Minimal',
    duration: 240,
    synth: {
      bpm: 78,
      chords: [
        [55, 58, 62, 65, 69], // Gm9
        [48, 52, 58, 62], // C9
        [53, 57, 60, 64, 67], // Fmaj9
        [50, 53, 57, 60], // Dm7
      ],
      melody: 0.15,
      drums: 'full',
      tone: 2300,
    },
  },
]
