// Delivered by Originkit · stack: nextjs · styling: tailwind
"use client";

/**
 * Shared stage geometry for hero-37.
 *
 * Every frame is a fixed-width composition — a centred copy column with art
 * scattered around it at absolute Figma coordinates — so the stage caps at each
 * frame's own width and centres, and the art is placed as a percentage of that
 * cap. That reproduces all three frames exactly at their own widths and keeps
 * the scatter proportional in between, where a raw 1440 pixel would not.
 */
export const STAGE =
  "relative mx-auto w-full max-w-[402px] ipad:max-w-[744px] desktop-sm:max-w-[1440px]";

/** Figma frame widths, used to turn its x coordinates into percentages. */
export const FRAME = { mobile: 402, ipad: 744, desktop: 1440 } as const;

/**
 * Frame heights (874 / 1133 / 935) are floors, not heights: `<main>` also takes
 * `min-h-dvh` so the page colour reaches the bottom of any screen. The surplus
 * falls below the card stack, which is the one block the design already hangs
 * off the bottom edge.
 */
export const STAGE_HEIGHT =
  "min-h-[874px] ipad:min-h-[1133px] desktop-sm:min-h-[935px]";

/** Figma fills the page #f5f5f2 at every frame. */
export const PAGE = "bg-[#f5f5f2]";
