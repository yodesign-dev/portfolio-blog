// Delivered by Originkit · stack: nextjs · styling: tailwind
"use client";

import { Sticker } from "@/components/originkit/ui/hero-37/sticker";
import { shadowRatio } from "@/components/originkit/ui/hero-37/sticker-geometry";

function asset(file: string) {
  return `/originkit/hero-37/${file}`;
}

/**
 * The folder at the bottom edge (Figma 1457:1598 / 1457:1498 / 1457:1249).
 *
 * Three layers, and the order is the whole effect: a plate behind, the three
 * cards, then a front panel painted *over* their lower halves so they read as
 * tucked into a pocket rather than stacked on a tray. Getting that wrong is not
 * subtle — the cards float clear of the folder and the panel reads as a stray
 * white shape below them.
 *
 * So the panel carries a z above the cards rather than sharing a wrapper with
 * the plate. The cards sit between the two, and they are stickers, not art:
 * each one peels and drags like the six loose ones, which is why they are not
 * inside a scaled wrapper — a WebGL canvas under a CSS `scale` rasterises at the
 * wrong size and comes back soft.
 *
 * The plate and panel are restated per frame instead of scaled for the same
 * reason the order matters: they interleave with canvases, and a transform on
 * either would take the whole layer out of the flow the z-order depends on.
 * Every number is Figma's own — the phone's are the tablet's at 0.7056, which is
 * the frame ratio, so they agree by construction rather than by rounding.
 *
 * The folder hangs below the frame's bottom edge by 11.4 / 5.5 / 47.5 — Figma
 * runs it off the fold — so it is measured from the bottom, which also keeps it
 * on the fold when `min-h-dvh` makes the stage taller than the frame.
 */
const STACK =
  "absolute bottom-[-11.4px] left-1/2 h-[170.391px] w-[221.234px] -translate-x-1/2 ipad:bottom-[-5.5px] ipad:h-[241.497px] ipad:w-[313.558px] desktop-sm:bottom-[-47.5px]";

/**
 * Rotated bounding boxes, phone / tablet — Figma's own outer boxes.
 *
 * Figma's card is the exception: it is the only sticker in the section with no
 * rotation, so its bounding box *is* the card and the white stroke lands flush
 * on the artwork's edge. Rasterised into a texture that edge blends with the
 * transparency outside it, which reads as a grey hairline round the border —
 * the turned cards never show it because their bounding box gives them padding.
 * Its artwork carries 20 units of it deliberately, so the box and the placement
 * are 1.0357 of Figma's and shifted back by half the pad (2.0 / 1.41). The card
 * itself still renders at 112 and 79.023.
 */
const FIGMA = { mobile: 81.845, ipad: 116 };
const SLACK = { mobile: 86.968, ipad: 123.261 };
const NOTION = { mobile: 106.188, ipad: 150.501 };

/**
 * The folder cards carry a far heavier shadow than the loose stickers —
 * `0 6.265 29.366` against `0.776 0.776 0.772` — because they are lifted off a
 * plate rather than lying on the page. It is stated once against the 112 card
 * and resolved per sticker, since each one's canvas is a different rotated box.
 */
const CARD_SHADOW = { x: 0, y: 6.265, blur: 29.366 };

/** The notched folder outline, as geometry — see the panel comment below. */
const PANEL_MASK = `url(${asset("folder-panel-fill.svg")})`;

export const CardStack = () => (
  <div className={`${STACK} z-[15]`}>
    {/* The plate behind everything: a white hairline over #f5f5f5, lifted on a
        soft drop shadow and lined with an inset glow. The fill sits on a child
        so the inset shadow paints over it rather than under it. */}
    <div
      aria-hidden
      className="pointer-events-none absolute top-[7.76px] left-[14.81px] z-0 h-[160.868px] w-[196.146px] rounded-[13.457px] border-[0.666px] border-solid border-white shadow-[0px_10.766px_16.148px_0px_rgba(0,0,0,0.3)] ipad:top-[11px] ipad:left-[21px] ipad:h-[228px] ipad:w-[278px] ipad:rounded-[19.073px] ipad:border-[0.943px] ipad:shadow-[0px_15.258px_22.887px_0px_rgba(0,0,0,0.3)]"
    >
      <span
        aria-hidden
        className="absolute inset-0 rounded-[inherit] bg-[#f5f5f5]"
      />
      <span
        aria-hidden
        className="absolute inset-0 rounded-[inherit] shadow-[inset_0px_0px_26.914px_0px_rgba(255,255,255,0.4)] ipad:shadow-[inset_0px_0px_38.146px_0px_rgba(255,255,255,0.4)]"
      />
    </div>

    {/*
      Paint order is Figma's own sibling order: Figma at the back, then Slack,
      then Notion in front, and the panel over all three. It is not the order the
      shapes suggest — Figma's card is the largest and squarest, so it reads as
      the front one, but the file puts it behind both turned cards.
    */}
    <Sticker
      name="notion"
      label="Notion"
      size={NOTION}
      shadow={shadowRatio(CARD_SHADOW, NOTION.ipad)}
      className="top-[-1.41px] left-[11.28px] z-[3] ipad:top-[-2px] ipad:left-[16px]"
    />
    <Sticker
      name="slack"
      label="Slack"
      size={SLACK}
      shadow={shadowRatio(CARD_SHADOW, SLACK.ipad)}
      className="top-[14.11px] left-[117.83px] z-[2] ipad:top-[20px] ipad:left-[167px]"
    />
    <Sticker
      name="figma"
      label="Figma"
      size={FIGMA}
      shadow={shadowRatio(CARD_SHADOW, FIGMA.ipad)}
      className="top-[-31.91px] left-[64.04px] z-[1] ipad:top-[-45.24px] ipad:left-[90.76px]"
    />

    {/*
      The folder's front panel, over the cards — and it is frosted glass, not a
      flat shape: white at 20% over a `backdrop-filter: blur(3.81px)`, with a
      1.144 white stroke around the notched folder outline.

      That blur is the reason it is rebuilt here rather than shipped as the
      export. Figma delivers it through a `foreignObject`, and browsers refuse to
      rasterise one when an SVG arrives as an image — so the export renders the
      fill and the stroke and drops the blur silently, which is why the cards
      behind it stayed sharp instead of sinking into the pocket.

      So it splits: the folder outline masks a box that carries the fill and the
      blur, and the stroke rides on top as its own plain path. A stroke cannot
      come from a mask, and the blur cannot come from an image, so neither half
      can do the other's job.

      The panel does not fill its own frame either — Figma insets it 0.64% from
      the left and 1.02% from the right, sitting a hair inside the folder's
      width. The inset goes on this wrapper with the layers filling it.
    */}
    <div
      aria-hidden
      className="pointer-events-none absolute top-[43.63px] left-0 z-[4] h-[126.766px] w-[221.234px] ipad:top-[61.83px] ipad:h-[179.667px] ipad:w-[313.558px]"
    >
      <span className="absolute inset-[0_1.02%_0_0.64%]">
        {/*
          The blur is stated at the panel's own width, so the phone takes it at
          the frame ratio (0.7056) rather than the same absolute radius — a fixed
          3.81 there would be half again as strong against a panel two-thirds the
          size.
        */}
        <span
          className="absolute inset-0 block bg-white/20 backdrop-blur-[2.688px] ipad:backdrop-blur-[3.81px]"
          style={{
            maskImage: PANEL_MASK,
            WebkitMaskImage: PANEL_MASK,
            maskSize: "100% 100%",
            WebkitMaskSize: "100% 100%",
            maskRepeat: "no-repeat",
            WebkitMaskRepeat: "no-repeat",
          }}
        />
        <img
          src={asset("folder-panel-stroke.svg")}
          alt=""
          className="absolute inset-0 block size-full max-w-none"
        />
      </span>
    </div>
  </div>
);
