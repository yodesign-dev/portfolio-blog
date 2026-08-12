// Delivered by Originkit · stack: nextjs · styling: tailwind
"use client";

import { Backdrop } from "@/components/originkit/ui/hero-37/backdrop";
import { CardStack } from "@/components/originkit/ui/hero-37/card-stack";
import { DragMe } from "@/components/originkit/ui/hero-37/drag-me";
import { HeroCopy } from "@/components/originkit/ui/hero-37/hero-copy";
import { Navbar } from "@/components/originkit/ui/hero-37/navbar";
import { PAGE, STAGE, STAGE_HEIGHT } from "@/components/originkit/ui/hero-37/stage";
import { StickerField } from "@/components/originkit/ui/hero-37/sticker-field";

/**
 * Figma frames:
 * - Mobile  1457:1521 — 402 x 874
 * - iPad    1457:1307 — 744 x 1133  (`ipad:`)
 * - Desktop 1457:1040 — 1440 x 935  (`desktop-sm:`)
 *
 * A centred hero with app stickers scattered around it, each one peelable and
 * draggable — the OriginKit `draggable-sticker` is the section, and everything
 * else is the surface it is thrown onto.
 *
 * The composition is a scatter, so the stage caps at each frame's own width and
 * centres, and every sticker is placed as a percentage of that cap. Capping is
 * what keeps the scatter reading as composed: uncapped, the six stickers walk
 * outward on a wide screen and leave the copy alone in the middle. The page
 * colour and the desktop backdrop bleed past it.
 *
 * Height is a floor rather than a height — `min-h-dvh` on `<main>` so the page
 * colour reaches the bottom of any screen, with each frame's own height as the
 * stage's minimum. The surplus falls below the card stack, which is the one
 * block the design already hangs off the bottom edge, so it takes the slack
 * without anything being stranded.
 *
 * Paint order: backdrop, then the card stack, then the copy, then the stickers
 * over both. Figma has the stickers above everything except the annotation
 * pointing at one of them, and the stickers have to be topmost anyway — they are
 * the thing you pick up.
 */
export const SectionHero = () => (
  <main
    className={`animate-hero-reveal relative isolate flex min-h-dvh w-full flex-col overflow-hidden ${PAGE}`}
  >
    <Backdrop />

    <div className={`${STAGE} ${STAGE_HEIGHT} z-10 flex flex-1 flex-col`}>
      <Navbar />

      {/*
        Hero copy hangs off the top of the stage at Figma's own offsets — 201 /
        238 / 283 — rather than centring in the frame. The frames put it a fixed
        distance under the nav and let the stickers fill what is left, so
        centring it would move it as the stage grows past the frame height while
        the scatter around it stayed put.
      */}
      <div className="relative z-20 mt-[133px] flex justify-center ipad:mt-[167px] desktop-sm:mt-[203px]">
        <HeroCopy />
      </div>

      <CardStack />
      <StickerField />
      <DragMe />
    </div>
  </main>
);
