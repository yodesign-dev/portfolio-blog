"use client";

import { useEffect, useRef } from "react";

// Avatar origami chuyển động (quay đầu, gật nhẹ, chớp mắt — tạo bằng
// Seedance trên Figma Weave, khung đầu = khung cuối nên lặp liền mạch).
// Không để autoPlay trên thẻ: chỉ play khi người dùng KHÔNG bật
// prefers-reduced-motion, còn lại đứng yên ở poster.
export const AvatarLoop = ({ alt }: { alt: string }) => {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      if (reduce.matches) {
        video.pause();
        video.currentTime = 0;
      } else {
        // Trình duyệt có thể chặn play (tiết kiệm pin…) — khi đó poster vẫn hiện
        video.play().catch(() => {});
      }
    };
    sync();
    reduce.addEventListener("change", sync);
    return () => reduce.removeEventListener("change", sync);
  }, []);

  return (
    <video
      ref={ref}
      muted
      loop
      playsInline
      preload="auto"
      poster="/avatar-loop-poster.jpg"
      role="img"
      aria-label={alt}
      className="h-full w-full object-cover"
    >
      <source src="/avatar-loop.webm" type="video/webm" />
      <source src="/avatar-loop.mp4" type="video/mp4" />
    </video>
  );
};
