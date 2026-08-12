// Delivered by Originkit · stack: nextjs · styling: tailwind
"use client";

import { Button } from "@/components/originkit/ui/hero-37/button";

function asset(file: string) {
  return `/originkit/hero-37/${file}`;
}

const blockNav = (event: { preventDefault: () => void }) => {
  event.preventDefault();
};

/**
 * Top nav — Figma 1457:1522 (mobile), 1457:1308 (tablet), 1457:1284 (desktop).
 *
 * Wordmark against a hamburger below 1280; above it the full row — four links
 * and a CTA. The bar is inset 32 / 48 from the frame edge on the stacked frames;
 * on desktop Figma centres a 752px row in the 1440 frame instead, which is a
 * 344px inset, so the row takes that width and centres rather than carrying a
 * third padding number.
 */
const NAV_LINKS = ["Explore", "Plans", "Gallery", "Pricing"] as const;

const LINK =
  "inline-flex min-h-11 items-center font-tight text-[17px] leading-[25.5px] tracking-[-0.34px] whitespace-nowrap text-black cursor-pointer transition-[opacity,transform] duration-200 ease-out [-webkit-tap-highlight-color:transparent] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#121212] [@media(hover:hover)_and_(pointer:fine)]:hover:opacity-70";

export const Navbar = () => (
  <nav
    aria-label="Primary"
    className="relative z-30 flex w-full items-center justify-between px-[32px] py-[16px] ipad:h-[71px] ipad:px-[48px] ipad:py-[32px] desktop-sm:mx-auto desktop-sm:h-[50px] desktop-sm:w-[752px] desktop-sm:px-0 desktop-sm:pt-[30px] desktop-sm:pb-0"
  >
    <a
      href="#"
      aria-label="ArchiFlow home"
      onClick={blockNav}
      className="flex shrink-0 items-center gap-[8px] cursor-pointer transition-[opacity,transform] duration-200 ease-out [-webkit-tap-highlight-color:transparent] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#121212] [@media(hover:hover)_and_(pointer:fine)]:hover:opacity-70"
    >
      <img
        src={asset("logo-mark.svg")}
        alt=""
        aria-hidden
        className="block h-[20px] w-[18px] max-w-none"
      />
      <span className="font-sans text-[20px] leading-[25.5px] font-semibold tracking-[-0.4px] whitespace-nowrap text-[#121212]">
        ArchiFlow
      </span>
    </a>

    <ul className="hidden items-center gap-[24px] desktop-sm:flex">
      {NAV_LINKS.map((link) => (
        <li key={link}>
          <a href="#" onClick={blockNav} className={LINK}>
            {link}
          </a>
        </li>
      ))}
    </ul>

    {/*
      Figma spells this "Srart Free" in all three frames — transcribed literally.

      The hide goes on a wrapper, not on the button. `Button` carries
      `inline-flex` in its base class and both are plain display utilities, so
      which one wins is decided by their order in the compiled sheet rather than
      by the class string — and `inline-flex` was winning, leaving the CTA on the
      phone where the design has a hamburger.
    */}
    <div className="hidden desktop-sm:block">
      <Button variant="nav">Srart Free</Button>
    </div>

    {/*
      The hamburger keeps Figma's 24x24 box so the bar height stays 52 / 71;
      the touch target grows off an absolute inset instead, which `min-h-11` in
      flow would spend on the bar.
    */}
    <button
      type="button"
      aria-label="Open menu"
      className="relative size-[24px] shrink-0 cursor-pointer touch-manipulation desktop-sm:hidden [-webkit-tap-highlight-color:transparent] transition-[opacity,transform] duration-200 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#121212] active:scale-[0.97] motion-reduce:active:scale-100"
    >
      <span aria-hidden className="absolute -inset-2.5" />
      <img
        src={asset("menu.svg")}
        alt=""
        aria-hidden
        className="relative block size-full max-w-none"
      />
    </button>
  </nav>
);
