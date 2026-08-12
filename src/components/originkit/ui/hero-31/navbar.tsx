// Delivered by Originkit · stack: nextjs · styling: tailwind
"use client";

import { STAGE } from "@/components/originkit/ui/hero-31/stage";

function asset(file: string) {
  return `/originkit/hero-31/${file}`;
}

/**
 * Top Nav — Figma 2391:4828 (mobile) / 2391:4862 (tablet) / 2391:4904 (desktop).
 *
 * A 59px white bar across the top of an otherwise full-bleed hero. It is the one
 * opaque thing in the section, and it is what hides the top of the two vertical
 * rails, so it paints last (z-30) rather than being clipped.
 *
 * The bar and its bottom edge are full width; the row inside it is capped, so on
 * an ultrawide screen the wordmark and the CTA stay with the rest of the content
 * rather than drifting to the corners of the screen.
 *
 * The two layouts are genuinely different structures — a hamburger below 1280, a
 * link row plus a flush-right CTA block above it — so this is one of the cases
 * that earns a `hidden` pair rather than breakpoint classes on one tree.
 */

const NAV_LINKS = ["Home", "Pricing", "About", "Tools"] as const;

/** Shared pressable / focus stack — the house Button contract on a light bar. */
const CONTROL =
  "cursor-pointer touch-manipulation [-webkit-tap-highlight-color:transparent] transition-[opacity,transform] duration-200 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b1432] active:scale-[0.97] motion-reduce:active:scale-100 [@media(hover:hover)_and_(pointer:fine)]:hover:opacity-70";

const WORDMARK =
  "font-helvetica text-[22px] leading-[1.14] tracking-[-0.03em] text-[#090f2c]";

export const Navbar = () => (
  <nav
    aria-label="Primary"
    className="relative z-30 h-[59px] w-full shrink-0 bg-white"
  >
    <div
      className={`${STAGE} flex h-full items-center justify-between px-[16px] desktop-sm:hidden`}
    >
      <a
        href="#"
        aria-label="Voice AI home"
        className={`${WORDMARK} ${CONTROL}`}
      >
        Voice AI
      </a>
      {/* The icon is 24px sitting 16px off the edge; the negative margin lets the
          44px target grow around it without moving it. */}
      <button
        type="button"
        aria-label="Open menu"
        className={`-mr-[10px] flex size-11 items-center justify-center ${CONTROL}`}
      >
        <img
          src={asset("menu.svg")}
          alt=""
          aria-hidden
          className="block size-6 max-w-none"
        />
      </button>
    </div>

    <div
      className={`${STAGE} hidden h-full items-center justify-between desktop-sm:flex`}
    >
      <a
        href="#"
        aria-label="Voice AI home"
        className={`px-[48px] ${WORDMARK} ${CONTROL}`}
      >
        Voice AI
      </a>

      <div className="flex h-full items-center gap-[24px]">
        <ul className="flex items-center gap-[24px]">
          {NAV_LINKS.map((label) => (
            <li key={label}>
              <a
                href="#"
                className={`flex min-h-11 items-center font-tight text-[16px] leading-[1.2] text-[#090f2c] ${CONTROL}`}
              >
                {label}
              </a>
            </li>
          ))}
        </ul>

        {/* Full-bleed to the right edge and full nav height — the only element in
            the design that touches a corner of the frame. */}
        <button
          type="button"
          className={`flex h-full items-center bg-[#00ddff] px-[20px] font-tight text-[16px] leading-[1.2] font-medium text-[#0b1432] ${CONTROL}`}
        >
          Get In Touch
        </button>
      </div>
    </div>
  </nav>
);
