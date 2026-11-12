'use client'

// Công tắc người ngồi quầy (Anh / Chị) dùng chung cho màn chào và Cài đặt › Cảnh.
// Rê chuột / chạm / focus là tải sẵn người kia để đổi tức thì; mạng chậm thì nút vừa chọn
// hiện vòng xoay tới khi người mới hiện trong cảnh. Nút đang chọn chỉ viền + nền cam nhạt
// (như thẻ phòng đang chọn), để nút đặc màu cam duy nhất trên màn vẫn là việc chính.

import {SEATS, type Seat} from './themes'

// Ảnh mặt cắt từ ảnh nội thất 1280×720 (toạ độ trên lưới 224×126): lấy cả đầu lẫn vai để
// phân biệt được anh (tóc ngắn, kính, áo tối) với chị (tóc buộc, dây buộc hồng, áo tím)
const FACES: Record<Seat, string> = {boy: '/chill/scenes/interior.webp', girl: '/chill/scenes/interior-girl.webp'}
const CROP = {x: 168, y: 52, size: 38}

export function SeatFace({seat, size}: {seat: Seat; size: number}) {
  const k = size / CROP.size
  return (
    <span
      aria-hidden
      className="block shrink-0 rounded-full bg-[#c4d6e2] bg-no-repeat [image-rendering:pixelated]"
      style={{
        width: size,
        height: size,
        backgroundImage: `url(${FACES[seat]})`,
        backgroundSize: `${224 * k}px ${126 * k}px`,
        backgroundPosition: `${-CROP.x * k}px ${-CROP.y * k}px`,
      }}
    />
  )
}

// variant: 'panel' = trong Cài đặt (36px, 44px trên màn chạm); 'touch' = màn chào dọc (44px);
// 'bar' = thanh màn chào ngang (40px; màn thấp chỉ còn mặt 44px, tên đọc qua title / sr-only)
export function SeatToggle({
  seat,
  onSeat,
  onWarm,
  loading,
  label,
  names,
  variant = 'panel',
}: {
  seat: Seat
  onSeat: (seat: Seat) => void
  onWarm: (seat: Seat) => void
  loading: Seat | null
  // Tên nhóm cho trình đọc màn hình
  label: string
  names: Record<Seat, string>
  variant?: 'panel' | 'touch' | 'bar'
}) {
  const size = variant === 'panel' ? 28 : 32
  const height =
    variant === 'panel'
      ? 'min-h-9 touch:min-h-11'
      : variant === 'touch'
        ? 'h-11'
        : 'h-10 touch:h-11 [@media(max-height:500px)]:size-11 [@media(max-height:500px)]:justify-center [@media(max-height:500px)]:p-0'
  return (
    <div className="flex shrink-0 gap-1 rounded-full border border-white/10 bg-black/55 p-1 backdrop-blur" role="radiogroup" aria-label={label}>
      {SEATS.map((s) => {
        const active = s === seat
        return (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={active}
            aria-busy={loading === s}
            // Mẫu radio: chỉ nút đang chọn nằm trong thứ tự Tab, mũi tên đổi người (radio-keys.ts)
            tabIndex={active ? 0 : -1}
            onPointerEnter={() => onWarm(s)}
            onPointerDown={() => onWarm(s)}
            onFocus={() => onWarm(s)}
            onClick={() => onSeat(s)}
            title={names[s]}
            className={`flex items-center gap-2 rounded-full pl-1 pr-3.5 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e8b27d] ${height} ${
              active ? 'bg-[#e8b27d]/15 text-[#f3cfa8] ring-1 ring-inset ring-[#e8b27d]/70' : 'text-white/80 hover:bg-white/10 hover:text-white'
            }`}
          >
            <span className="relative block shrink-0" style={{width: size, height: size}}>
              <SeatFace seat={s} size={size} />
              {loading === s && (
                <span aria-hidden className="absolute inset-0 animate-spin rounded-full border-2 border-[#f3cfa8]/25 border-t-[#f3cfa8] motion-reduce:animate-none" />
              )}
            </span>
            <span className={variant === 'bar' ? '[@media(max-height:500px)]:sr-only' : ''}>{names[s]}</span>
          </button>
        )
      })}
    </div>
  )
}
