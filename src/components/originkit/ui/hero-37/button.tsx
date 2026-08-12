// Delivered by Originkit · stack: nextjs · styling: tailwind
"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

function asset(file: string) {
  return `/originkit/hero-37/${file}`;
}

/**
 * The two hero CTAs (Figma 1457:1180 / 1457:1187 and their phone and tablet
 * twins), plus the nav's "Srart Free", which is the secondary at a slightly
 * tighter inset.
 *
 * Both are one box at two scales. Figma draws the phone and tablet at 0.954 of
 * the desktop — 22.904 against 24, 11.452 against 12, 13.361 against 14 — which
 * is a single factor rather than three re-pitched numbers, so the smaller pair
 * is written as the base and desktop restates the round values.
 */
type ButtonVariant = "primary" | "secondary" | "nav";

const BASE_CLASS =
  "relative inline-flex shrink-0 cursor-pointer touch-manipulation items-center justify-center whitespace-nowrap font-lato font-semibold transition-[opacity,transform] duration-200 ease-out [-webkit-tap-highlight-color:transparent] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#121212] active:scale-[0.97] motion-reduce:active:scale-100 [@media(hover:hover)_and_(pointer:fine)]:hover:opacity-90";

/**
 * Figma layers a white top sheen over a flat #292929 rather than colouring the
 * fill twice — the second stop is the same colour at both ends, so it is the
 * base and the first is the light on it.
 */
const PRIMARY_FILL =
  "linear-gradient(180deg, rgba(255,255,255,0.2) 4.0988%, rgba(255,255,255,0) 43.902%), linear-gradient(90deg, rgb(41,41,41) 0%, rgb(41,41,41) 100%)";

const VARIANT: Record<ButtonVariant, string> = {
  /** Five stacked shadows, the first at zero alpha — Figma's own ramp, kept whole. */
  primary:
    "gap-[0.954px] overflow-clip rounded-[11.452px] border-t-[0.954px] border-solid border-[rgba(255,255,255,0.15)] pl-[22.904px] pr-[13.361px] py-[13.361px] text-[16px] leading-[1.5] tracking-[-0.32px] text-white shadow-[0px_60.123px_17.178px_0px_rgba(16,16,16,0),0px_38.173px_15.269px_0px_rgba(11,11,11,0.01),0px_21.95px_13.361px_0px_rgba(8,8,8,0.05),0px_9.543px_9.543px_0px_rgba(5,5,5,0.09),0px_2.863px_5.726px_0px_rgba(0,0,0,0.1)] desktop-sm:gap-px desktop-sm:rounded-[12px] desktop-sm:border-t desktop-sm:pl-[24px] desktop-sm:pr-[14px] desktop-sm:py-[14px] desktop-sm:shadow-[0px_63px_18px_0px_rgba(16,16,16,0),0px_40px_16px_0px_rgba(11,11,11,0.01),0px_23px_14px_0px_rgba(8,8,8,0.05),0px_10px_10px_0px_rgba(5,5,5,0.09),0px_3px_6px_0px_rgba(0,0,0,0.1)]",
  secondary:
    "gap-[9.543px] rounded-[9.543px] border-[0.954px] border-solid border-[rgba(0,0,0,0.1)] bg-[rgba(0,0,0,0.02)] pl-[22.904px] pr-[13.361px] py-[13.361px] text-[14px] leading-[1.5] tracking-[-0.42px] text-[#121212] desktop-sm:gap-[10px] desktop-sm:rounded-[10px] desktop-sm:border desktop-sm:pl-[24px] desktop-sm:pr-[14px] desktop-sm:py-[14px]",
  /** Same plate as the secondary; Figma insets it 20/12 instead of 24/14. */
  nav: "gap-[10px] rounded-[10px] border border-solid border-[rgba(0,0,0,0.1)] bg-[rgba(0,0,0,0.02)] pl-[20px] pr-[12px] py-[14px] text-[14px] leading-[1.5] tracking-[-0.42px] text-[#121212]",
};

/**
 * Figma's chevron, exported twice because the fill differs with the plate.
 *
 * The glyph does not fill its icon box — Figma insets it 28.66/35.71/23.78/35.72
 * inside the 22px square, which is a 6.29x10.46 chevron with air around it. The
 * export carries `preserveAspectRatio="none"`, so sizing the file to the square
 * stretches a 6x10 path into 22x22 and the arrow comes out fat and blunt. The
 * inset goes on a wrapper and the image fills *that*, which is both Figma's own
 * nesting and the only way the aspect survives.
 */
const ICON_BOX: Record<ButtonVariant, string> = {
  primary: "size-[20.995px] desktop-sm:size-[22px]",
  secondary: "size-[20.995px] desktop-sm:size-[22px]",
  nav: "size-[22px]",
};

const ICON_INSET = "absolute inset-[28.66%_35.71%_23.78%_35.72%]";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  children: ReactNode;
};

export const Button = ({
  variant = "primary",
  children,
  className = "",
  type = "button",
  ...props
}: ButtonProps) => (
  <button
    type={type}
    className={`${BASE_CLASS} ${VARIANT[variant]} ${className}`}
    style={
      variant === "primary" ? { backgroundImage: PRIMARY_FILL } : undefined
    }
    {...props}
  >
    {children}
    <span
      aria-hidden
      className={`relative block shrink-0 ${ICON_BOX[variant]}`}
    >
      {/*
        The inset belongs on this wrapper with the image filling it. Both on one
        element and `size-full` wins over the inset, which collapses the box back
        to the square and stretches the chevron again — the same trap
        `section-39/corner-glow.tsx` carries a note about.
      */}
      <span className={ICON_INSET}>
        <img
          src={
            variant === "primary"
              ? asset("arrow-light.svg")
              : asset("arrow-dark.svg")
          }
          alt=""
          className="block size-full max-w-none"
        />
      </span>
    </span>
    {variant === "primary" && (
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0px_0.954px_0.954px_0px_rgba(255,255,255,0.3)] desktop-sm:shadow-[inset_0px_1px_1px_0px_rgba(255,255,255,0.3)]"
      />
    )}
  </button>
);
