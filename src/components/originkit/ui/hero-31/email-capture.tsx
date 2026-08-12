// Delivered by Originkit · stack: nextjs · styling: tailwind
"use client";

"use client";

import { useState, type FormEvent } from "react";

/**
 * Figma 2391:4839 (mobile) / 2391:4874 (tablet) / 2391:4922 (desktop).
 *
 * A white field and a cyan submit, both square, sharing a row. Figma widths are
 * input + gap + button = the full content column at every frame (241+8+113=362,
 * 479+32+121=632, 374.5+32+121=527.5), so the input is the flexible one and the
 * button is only as wide as its label plus padding.
 *
 * The desktop cap is the one number that is not a transcription. Its column is
 * half of a full-bleed band, so past 1280 the field would keep stretching with
 * the viewport; 527.5px is what Figma gives it at 1280, and holding that keeps
 * the form reading as a control rather than a rule.
 *
 * Figma draws the mobile row 43px tall. It is 44 here so the submit clears the
 * 44px touch minimum, and `items-stretch` carries the extra pixel to the input
 * too — a 1px row where the two halves disagree in height is the more visible
 * error of the two.
 */
export const EmailCapture = () => {
  const [email, setEmail] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex min-h-11 w-full items-stretch gap-[8px] ipad:gap-[32px] desktop-sm:max-w-[527.5px]"
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
        Get In Touch
      </button>
    </form>
  );
};
