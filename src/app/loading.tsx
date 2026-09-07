import ParticleTether from '@/components/originkit/particle-tether'

export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <ParticleTether
        width={120}
        height={120}
        dotColor="#171717"
        density={220}
        dotSize={100}
        speed={60}
        spinTurns={1}
        // Không cần kéo thả trong lúc loading — tắt drag để tránh người
        // dùng vô tình tương tác với thứ chỉ đang hiển thị tạm thời.
        pointer={{drag: 0, damping: 20}}
      />
    </div>
  )
}
