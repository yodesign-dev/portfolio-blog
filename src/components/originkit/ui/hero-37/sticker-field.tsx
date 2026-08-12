// Delivered by Originkit · stack: nextjs · styling: tailwind
"use client";

import { Sticker } from "@/components/originkit/ui/hero-37/sticker";
import { shadowRatio } from "@/components/originkit/ui/hero-37/sticker-geometry";

/**
 * The six loose stickers scattered around the copy (Figma 1457:1546-1598 on the
 * phone, 1457:1446-1489 on the tablet, 1457:1077-1304 on desktop).
 *
 * They re-place rather than scale: each frame scatters them differently around
 * its own column, so every position is that frame's own. `x` is a percentage of
 * the stage — the stage is capped at each frame's width, so the percentages are
 * exact there and hold the scatter proportional in between, where a 1440 pixel
 * would drift. `y` stays in pixels because the frames are top-anchored and their
 * heights differ for reasons the scatter does not follow.
 */

/** Card 62 on the phone, 82 from the tablet up — as a rotated 19.87deg box. */
const CW = { mobile: 79.382, ipad: 104.986 };

/** Drive is the one tilted the other way (17.93deg), so its box is tighter. */
const CCW = { mobile: 78.076, ipad: 103.259 };

/**
 * Figma's rest shadow on a loose card: 0.776 at 82, 0.587 at 62 — the same
 * ratio, so one statement covers both frames. It is resolved against each
 * sticker's own box, which differs with the tilt.
 */
const LOOSE_SHADOW = { x: 0.776, y: 0.776, blur: 0.772 };

const STICKERS = [
  {
    name: "calendar",
    label: "Google Calendar",
    size: CW,
    shadow: shadowRatio(LOOSE_SHADOW, CW.ipad),
    className:
      "left-[4.229%] top-[115px] ipad:left-[8.065%] ipad:top-[119px] desktop-sm:left-[16.736%] desktop-sm:top-[160.866px]",
  },
  {
    name: "gmail",
    label: "Gmail",
    size: CW,
    shadow: shadowRatio(LOOSE_SHADOW, CW.ipad),
    className:
      "left-[71.642%] top-[58px] ipad:left-[77.285%] ipad:top-[56px] desktop-sm:left-[72.653%] desktop-sm:top-[108.07px]",
  },
  {
    name: "github",
    label: "GitHub",
    size: CW,
    shadow: shadowRatio(LOOSE_SHADOW, CW.ipad),
    className:
      "left-[8.657%] top-[485.8px] ipad:left-[4.839%] ipad:top-[634px] desktop-sm:left-[16.736%] desktop-sm:top-[480.866px]",
  },
  {
    name: "claude",
    label: "Claude",
    size: CW,
    shadow: shadowRatio(LOOSE_SHADOW, CW.ipad),
    /*
      Lifted 20px on the phone, above Figma's y512.47 — a called change, not a
      measurement. It sits as a translate rather than a smaller `top` so the
      design's own coordinate stays legible beside the correction, and it is
      cleared at `ipad:` where the tablet frame places the card on its own.
    */
    className:
      "left-[56.468%] top-[512.47px] -translate-y-[20px] ipad:left-[67.07%] ipad:top-[626.27px] ipad:translate-y-0 desktop-sm:left-[79.866%] desktop-sm:top-[445.136px]",
  },
  {
    name: "drive",
    label: "Google Drive",
    size: CCW,
    shadow: shadowRatio(LOOSE_SHADOW, CCW.ipad),
    className:
      "left-[15.92%] top-[611px] ipad:left-[9.677%] ipad:top-[813px] desktop-sm:left-[21.688%] desktop-sm:top-[669.068px]",
  },
  {
    name: "jira",
    label: "Jira",
    size: CW,
    shadow: shadowRatio(LOOSE_SHADOW, CW.ipad),
    className:
      "left-[74.876%] top-[654px] ipad:left-[79.973%] ipad:top-[934px] desktop-sm:left-[77.861%] desktop-sm:top-[794.07px]",
  },
];

export const StickerField = () => (
  <>
    {STICKERS.map((sticker) => (
      <Sticker
        key={sticker.name}
        {...sticker}
        className={`z-20 ${sticker.className}`}
      />
    ))}
  </>
);
