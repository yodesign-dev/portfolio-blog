"use client";

import { useState, type FormEvent } from "react";

type EmailCaptureProps = {
  fullWidth?: boolean; // true khi nằm trong container đã bị chia cột (như InfoBand)
};

export const EmailCapture = ({ fullWidth = false }: EmailCaptureProps) => {
  const [email, setEmail] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`flex min-h-11 w-full items-stretch gap-[8px] ipad:gap-[32px] ${
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
        className="min-w-0 flex-1 bg-white p-[12px] font-tight text-[16px] leading-[1.2] text-[#0b1432] placeholder:text-[#0b1432]/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ipad:p-[16px]"
      />
      <button
        type="submit"
        className="flex shrink-0 cursor-pointer touch-manipulation items-center justify-center bg-[#00ddff] p-[12px] font-tight text-[16px] leading-[1.2] font-medium whitespace-nowrap text-[#0b1432] transition-[opacity,transform] duration-200 ease-out [-webkit-tap-highlight-color:transparent] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:scale-[0.97] motion-reduce:active:scale-100 ipad:p-[16px] [@media(hover:hover)_and_(pointer:fine)]:hover:opacity-90"
      >
        Submit
      </button>
    </form>
  );
};