// Delivered by Originkit · stack: nextjs · styling: tailwind
"use client";

function asset(file: string) {
  return `/originkit/hero-37/${file}`;
}

/**
 * The hand-drawn "Drag me" annotation (Figma 1457:1550 / 1457:1475 /
 * 1457:1276) — a curved arrow, a grab-hand glyph and the label, aimed at the
 * Claude sticker.
 *
 * The three pieces are placed independently rather than as one block with
 * offsets, because Figma re-arranges them per frame: the phone and tablet set
 * the hand well right of the arrow's tail, desktop tucks it almost under it.
 * Each `left` is a percentage of the stage, from Figma's own inset percentages
 * on the frame, so the annotation tracks the sticker it points at as the stage
 * re-pitches.
 *
 * The arrow is the one piece that is not simply its box. Figma draws it rotated
 * inside that box and sizes it to the box's *diagonals* —
 * `rotate(-30.85deg) scaleX(-1)`, `w = hypot(-76.4527cqw, 53.6706cqh)`,
 * `h = hypot(23.5473cqw, 46.3294cqh)` — which resolves to 46.92x24.19 in a
 * 52.7x44.8 box, not 52.7x44.8. Stretching the export to fill the box instead
 * draws it about half again too large and sweeping the wrong way, which is what
 * ran it into the label and left the hand pointing nowhere near the sticker.
 * The hypot values are the same fractions at every frame, so they are resolved
 * to pixels here rather than carried as container queries.
 */
const ARROW_BOX =
  "absolute left-[66.47%] top-[463.5px] flex h-[44.8px] w-[52.7px] items-center justify-center ipad:left-[72.68%] ipad:top-[572.9px] ipad:h-[61.2px] ipad:w-[71.9px] desktop-sm:left-[84.58%] desktop-sm:top-[394px] desktop-sm:h-[61.15px] desktop-sm:w-[71.87px]";

const ARROW =
  "block h-[24.19px] w-[46.92px] max-w-none -scale-x-100 rotate-[-30.85deg] ipad:h-[33.02px] ipad:w-[64.04px] desktop-sm:h-[33px] desktop-sm:w-[64.01px]";

export const DragMe = () => (
  <div aria-hidden className="pointer-events-none absolute inset-0 z-30">
    <div className={ARROW_BOX}>
      <img src={asset("drag-arrow.svg")} alt="" className={ARROW} />
    </div>

    {/*
      The hand is a plain box at Figma's own inset — no rotation on this one, at
      any frame. Both exports carry `preserveAspectRatio="none"`, so the box is
      stated as width *and* height rather than a square: the wrong ratio does not
      crop them, it distorts them.

      Desktop moves the hand and the label off Figma's coordinates and out to the
      arrow's point, which is where the annotation reads from. Figma parks both
      *on* the head, so the barb runs under the hand and the arrow appears to
      stop in the middle of the glyph rather than to lead into it.

      The point is derived rather than eyeballed. The export's head is its
      max-x end; `-scale-x-100` swings that to the left of the box and
      `rotate(-30.85deg)` drops it, which puts it 25.7 left and 15.4 below the
      box centre — (1228, 440) on the 1440 stage — pointing along (-0.487,
      0.873). Both pieces are then shifted 28px down that vector, the one number
      to change if the pair should sit closer in or further out.
    */}
    <img
      src={asset("drag-hand.svg")}
      alt=""
      className="absolute left-[77.96%] top-[492.1px] block h-[18.8px] w-[19.8px] max-w-none ipad:left-[81.15%] ipad:top-[612px] ipad:h-[25.6px] ipad:w-[27px] desktop-sm:left-[89.19%] desktop-sm:top-[42.4%] desktop-sm:h-[25.6px] desktop-sm:w-[27px] ultrawide:top-[34%]"
    />

    {/*
      The label is turned inside its own box, so the box is the *rotated* bounds
      Figma reports (39.978 / 54.259) and the type is centred in it — placing the
      text itself at those coordinates would set the corner of an unturned line.
    */}
    <div className="absolute left-[81.42%] top-[459px] flex h-[39.193px] w-[39.978px] items-center justify-center ipad:left-[83.7%] ipad:top-[567px] ipad:h-[53.187px] ipad:w-[54.259px] desktop-sm:left-[91.51%] desktop-sm:top-[42%] ultrawide:top-[32%]">
      <p className="rotate-[-43.55deg] font-covered text-[13.192px] leading-[1.3] tracking-[-0.02em] whitespace-nowrap text-[#2b2a2a] opacity-80 ipad:text-[18px]">
        Drag me
      </p>
    </div>
  </div>
);
