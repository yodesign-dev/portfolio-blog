// Delivered by Originkit · stack: nextjs · styling: tailwind
"use client";

import { PAGE } from "@/components/originkit/ui/hero-37/stage";

function asset(file: string) {
  return `/originkit/hero-37/${file}`;
}

/**
 * Desktop backdrop (Figma 1457:1041) — three blurred washes, a band of soft
 * vertical bars across the top, and a dotted panel hanging off each edge.
 * Absent from the phone and tablet frames, which are the flat page colour.
 *
 * All of it is `desktop-sm:` only, and all of it is re-derived. Figma ships the
 * bars as 27 instances of one component and each edge panel as a 4MB SVG of
 * 12,810 separate paths — both are patterns wearing a flattened costume.
 */

/**
 * The bars (Figma 1457:1046). Twenty-seven columns on a 53.333 pitch — 1440/27
 * exactly — each masked to a 30x260 window at its own top-left, so this is a row
 * of short bars across the top of the frame and not full-height stripes, which
 * is what an earlier pass had.
 *
 * Their alpha is Figma's own mask gradient, which runs across each column at
 * 0.8, then 0.4 at 71.35%, then 0.1 — a bar that is firm at its left edge and
 * nearly gone at its right. What that gradient multiplies could not be read (the
 * paint lives on the component instance), so the scale comes from the frame's
 * own render: sampling across the band gives 236 to 246 against the #f5f5f2
 * page, so the strongest stop is 0.035 of black and the rest follow its ratios.
 */
const BARS =
  "repeating-linear-gradient(to right, rgba(0,0,0,0.035) 0px, rgba(0,0,0,0.0175) 21.4px, rgba(0,0,0,0.0044) 30px, rgba(0,0,0,0) 30px, rgba(0,0,0,0) 53.333px)";

/**
 * The edge dots (Figma 1457:1298 / 1457:1301). Figma flattens the field to
 * 12,810 rounded squares, every one white at exactly 0.1 — a uniform grid, so
 * one tile carries it. Measured off the export: 2.92px squares on a 4.993 x
 * 4.653 pitch, which puts 50 per row and 258 rows in the 249.651x1200.16 panel
 * and accounts for all 12,810.
 */
const DOT_TILE = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4.993' height='4.653'%3E%3Crect width='2.92' height='2.92' rx='0.42' fill='white' fill-opacity='0.1'/%3E%3C/svg%3E")`;

/**
 * Each panel carries a rectangle that Figma paints *into* the mask in black —
 * an alpha mask, so black is a hole. It reads as a bare card punched out of the
 * dots and outlined, which is what the fill and stroke below reproduce without
 * needing a mask at all.
 */
const EDGES = [
  { key: "left", left: -62, top: 69, cardX: 63, cardY: 557 },
  { key: "right", left: 1239.991, top: 11, cardX: 106.01, cardY: 560 },
] as const;

export const Backdrop = () => (
  <div
    aria-hidden
    className="pointer-events-none absolute inset-0 z-0 hidden overflow-hidden desktop-sm:block"
  >
    {/*
      The band sits at Figma's y-10 and stands 260 tall. `inset-x-0` rather than
      a width, so the 53.333 pitch carries past the 1440 cap on a wider screen
      instead of 27 fixed bars stretching. The foot is feathered because Figma
      softens the whole band under a 14.83px backdrop blur, which a hard 260 cut
      would not have.

      Full height at every column, and deliberately so: the arch — long bars at
      the two ends, shrinking toward the middle — is not in the bars at all. It
      is cut by the blurred plate below, which is why the band itself stays
      uniform here.
    */}
    <div
      className="absolute inset-x-0 top-[-10px] h-[260px]"
      style={{
        backgroundImage: BARS,
        maskImage:
          "linear-gradient(to bottom, #000 0%, #000 78%, transparent 100%)",
        WebkitMaskImage:
          "linear-gradient(to bottom, #000 0%, #000 78%, transparent 100%)",
      }}
    />

    {/*
      Everything below is placed in Figma's frame coordinates, so it hangs off a
      1440 box centred in the viewport rather than off `<main>`, which is
      full-bleed. Measured from the viewport's left edge these all sat where the
      design puts them on the left and fell short by the whole overflow on the
      right — the arch stopping early, the right-hand dot panel walking inward —
      which is only visible once the window is wider than the frame.

      The bars above stay full-bleed on purpose: they are a repeating pitch, not
      a placed object, so they carry to both edges at any width.
    */}
    <div className="absolute inset-y-0 left-1/2 w-[1440px] -translate-x-1/2">
      {/*
        Figma "Ellipse 48481" (1457:1076) — the light the section sits in, and
        the layer that gives the bar pattern its arch: it is the page colour
        washing back across the middle, so the bars survive full length at the
        two edges and dissolve toward the centre. It paints *over* the pattern,
        which is Figma's own sibling order and the only order that reads.

        Shipped as the export rather than as a CSS ellipse and blur. At 785 bytes
        it is a plain path and one `feGaussianBlur` — no `foreignObject`, so
        unlike the folder panel it rasterises correctly as an image — and it
        carries the blur's own falloff instead of an approximation of it.

        The node is 1358x960.5 at (66, -33.5); the file is padded to 1582x1184.5
        by the blur's bleed, which is the 8.25% / 11.66% inset. That inset sits on
        the wrapper with the image filling it, not on one element, or `size-full`
        wins and the bleed is cropped back off.
      */}
      <div
        className="absolute h-[960.5px] w-[1358px]"
        style={{ left: 66, top: -33.5 }}
      >
        <span className="absolute inset-[-11.66%_-8.25%]">
          <img
            src={asset("backdrop-ellipse.svg")}
            alt=""
            className="block size-full max-w-none"
          />
        </span>
      </div>

      {EDGES.map((edge) => (
        <div
          key={edge.key}
          className="absolute h-[1200.16px] w-[249.651px]"
          style={{
            left: edge.left,
            top: edge.top,
            backgroundImage: DOT_TILE,
            backgroundRepeat: "repeat",
          }}
        >
          <span
            className={`absolute h-[403px] w-[82px] border border-solid border-[#fdfdfd] ${PAGE}`}
            style={{ left: edge.cardX, top: edge.cardY }}
          />
        </div>
      ))}
    </div>
  </div>
);
