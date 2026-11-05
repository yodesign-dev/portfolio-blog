'use client'

import Image from 'next/image'
import {useState} from 'react'
import {TRUT_GIAN_URL} from '@/lib/site'

// Section "Just for fun" trang chủ: game Trút Giận Online, tách khỏi Side projects vì giọng
// điệu khác hẳn quán lofi. Xấp thẻ xoè theo mẫu Portrait Stack của Superdesign, mỗi thẻ là ảnh
// chụp một màn chơi thật, chữ lấy nguyên từ game. Cố ý bỏ thẻ sếp, vợ/chồng, người yêu vì trang
// này hướng tới nhà tuyển dụng.
const GRIPES = [
  {image: '/side/trut-gian-neighbor.jpg', title: 'Neighbor', detail: 'Midnight karaoke, drilling at 7am'},
  {image: '/side/trut-gian-court.jpg', title: 'Court hogs', detail: 'Took your court, “one more game” for 2h'},
  {image: '/side/trut-gian-teammate.jpg', title: 'Gaming teammate', detail: 'Feeding, flaming, AFK'},
  {image: '/side/trut-gian-client.jpg', title: 'Client', detail: 'Endless revisions, haggling'},
  {image: '/side/trut-gian-friend.jpg', title: 'Friend who owes you', detail: '“I’ll pay tomorrow” for 6 months'},
]

const arrowClass =
  'flex size-11 items-center justify-center rounded-full border border-neutral-300 text-neutral-700 transition-colors hover:border-neutral-900 hover:text-neutral-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand'

export function JustForFun() {
  const [active, setActive] = useState(0)
  const count = GRIPES.length
  const gripe = GRIPES[active]

  return (
    <section aria-labelledby="just-for-fun-title" className="overflow-hidden bg-white">
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-6 py-20 sm:px-8 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        {/* Chữ trên thẻ đã có ở dòng mô tả bên cạnh nên ẩn với trình đọc màn hình */}
        <div aria-hidden="true" className="relative mx-auto aspect-[3/4] w-52 sm:w-64">
          {GRIPES.map((card, index) => {
            // Khoảng cách tới thẻ đang mở tính vòng tròn, để xấp thẻ lặp chứ không hết
            let distance = (index - active + count) % count
            if (distance > count / 2) distance -= count
            const away = Math.abs(distance)
            return (
              <div
                key={card.title}
                style={{
                  transform: `translateX(${distance * 26}px) rotate(${distance * 6}deg) scale(${1 - away * 0.06})`,
                  zIndex: count - away,
                }}
                className="absolute inset-0 overflow-hidden rounded-2xl border border-black/10 bg-neutral-200 shadow-md transition-transform duration-300 ease-out motion-reduce:transition-none"
              >
                <Image src={card.image} alt="" fill sizes="(min-width: 640px) 256px, 208px" className="object-cover" />
                <span className="absolute inset-x-0 bottom-0 bg-black/70 px-3 py-2 text-center text-sm font-semibold text-white">
                  {card.title}
                </span>
              </div>
            )
          })}
        </div>

        <div className="max-w-lg">
          <div className="flex items-center gap-4">
            <Image
              src="/side/trut-gian-logo.webp"
              alt=""
              width={360}
              height={369}
              sizes="64px"
              className="h-auto w-16 shrink-0"
            />
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500">Just for fun</p>
              <h2 id="just-for-fun-title" className="mt-1 text-[28px] font-extrabold leading-tight tracking-tight text-neutral-900">
                Trút Giận Online
              </h2>
            </div>
          </div>
          <p className="mt-4 text-[15px] leading-relaxed text-neutral-600">
            A silly little rage game for when you need to blow off steam. It&apos;s loud, cheeky, and not for everyone.
          </p>

          <p className="mt-6 text-sm text-neutral-500">Who&apos;s annoying you today?</p>
          {/* Giữ chỗ 2 dòng để đổi thẻ không làm nút nhảy */}
          <p aria-live="polite" className="mt-1 min-h-14 text-lg font-semibold leading-snug text-neutral-900">
            <span className="sr-only">{gripe.title}: </span>
            {gripe.detail}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-3">
            <div className="flex gap-2">
              <button
                type="button"
                aria-label="Previous annoyance"
                onClick={() => setActive((active - 1 + count) % count)}
                className={arrowClass}
              >
                <span aria-hidden="true">←</span>
              </button>
              <button
                type="button"
                aria-label="Next annoyance"
                onClick={() => setActive((active + 1) % count)}
                className={arrowClass}
              >
                <span aria-hidden="true">→</span>
              </button>
            </div>
            <a
              href={TRUT_GIAN_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center text-sm font-semibold text-brand transition-colors hover:text-brand-hover focus-visible:underline"
            >
              Play in browser ↗
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
