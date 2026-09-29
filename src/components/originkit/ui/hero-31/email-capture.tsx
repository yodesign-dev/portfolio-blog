"use client";

import { useState, type FormEvent } from "react";
import { useContactModal } from "./contact-modal-context";

type EmailCaptureProps = {
  fullWidth?: boolean;
};

export const EmailCapture = ({ fullWidth = false }: EmailCaptureProps) => {
  const [email, setEmail] = useState("");
  const { openModal } = useContactModal();

  // ⬇️ CẬP NHẬT: thay vì chỉ preventDefault (không làm gì), giờ mở
  // ContactModal và mang theo email đã gõ sẵn — người dùng không phải
  // gõ lại email lần 2 trong modal.
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    openModal(email, "email_capture");
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`flex min-h-11 w-full items-stretch gap-[8px] md:gap-[32px] ${
        fullWidth ? "" : "desktop-sm:max-w-[527.5px]"
      }`}
    >
      <input
        type="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="Your email address"
        aria-label="Your email address"
        className="min-w-0 flex-1 bg-white p-[12px] text-[16px] leading-[1.2] text-ink placeholder:text-ink/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white md:p-[16px]"
      />
      <button
        type="submit"
        className="flex shrink-0 cursor-pointer touch-manipulation items-center justify-center bg-accent p-[12px] text-[16px] leading-[1.2] font-medium whitespace-nowrap text-ink transition-[opacity,transform] duration-200 ease-out [-webkit-tap-highlight-color:transparent] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:scale-[0.97] motion-reduce:active:scale-100 md:p-[16px] [@media(hover:hover)_and_(pointer:fine)]:hover:opacity-90"
      >
        Let&apos;s talk
      </button>
    </form>
  );
};
