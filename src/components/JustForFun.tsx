import Image from 'next/image'
import {TRUT_GIAN_URL} from '@/lib/site'

// Section "Just for fun" trang chủ: game Trút Giận Online tách khỏi Side projects vì giọng
// điệu khác hẳn quán lofi. Nền mận lấy từ ảnh chia sẻ của game.
export function JustForFun() {
  return (
    <section aria-labelledby="just-for-fun-title" className="bg-[#4a1b35]">
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-6 py-14 sm:flex-row sm:items-center sm:gap-10 sm:px-8">
        <Image
          src="/side/trut-gian-logo.webp"
          alt="Trút Giận Online logo: an angry cartoon character holding a toy hammer"
          width={360}
          height={369}
          sizes="160px"
          className="h-auto w-32 shrink-0 sm:w-40"
        />
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#f4c0d1]">Just for fun</p>
          <h2 id="just-for-fun-title" className="mt-1.5 text-[28px] font-extrabold leading-tight tracking-tight text-white">
            Trút Giận Online
          </h2>
          <p className="mt-2 text-[15px] leading-relaxed text-[#fbeaf0]">
            A silly little rage game for when you need to blow off steam. Pick what&apos;s annoying you, smash a dummy, and
            get on with your day. It&apos;s loud, cheeky, and not for everyone.
          </p>
          <a
            href={TRUT_GIAN_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-[#fac775] transition-colors hover:text-white focus-visible:underline sm:mt-3 sm:min-h-0"
          >
            Play in browser ↗
          </a>
        </div>
      </div>
    </section>
  )
}
