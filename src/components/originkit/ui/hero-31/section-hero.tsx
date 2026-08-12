// Delivered by Originkit · stack: nextjs · styling: tailwind
"use client";

"use client";

import { InfoBand } from "@/components/originkit/ui/hero-31/info-band";
import { Navbar } from "@/components/originkit/ui/hero-31/navbar";
import { STAGE } from "@/components/originkit/ui/hero-31/stage";
import { WaveField } from "@/components/originkit/ui/hero-31/wave-field";

/**
 * Figma frames:
 * - Mobile  2391:4825 — 402 x 874
 * - iPad    2391:4857 — 744 x 1133  (`ipad:`)
 * - Desktop 2391:4898 — 1280 x 832  (`desktop-sm:`)
 *
 * A full-viewport hero over a live dot field, split the way `section-30` splits:
 * the wave, the fade, the white nav bar and the band's three rules are full-bleed
 * and run to the screen edge; everything else sits on a capped stage. See
 * `stage.ts`. The design's only inset is a page gutter — rails at 16px on the
 * phone and 48px above it, with content 4px inside them at 20px / 56px — and
 * those are measured from the stage, so they hold their distance from the copy
 * instead of walking out to the corners of a wide screen.
 *
 * Height is two decisions. `<main>` takes `min-h-dvh` so the wave field and the
 * rails reach the bottom of any screen, and the headline region takes the frame
 * height less its siblings — nav, info band, capture row — as its own floor:
 * 449 / 470 / 429 against frames of 874 / 1133 / 832.
 *
 * That floor is what holds the design's own spacing, and the column says so
 * without a single absolute coordinate. Nav, headline, band and the frame's
 * closing gap are all in flow, and none of them stretches with the viewport, so
 * the headline stays a fixed distance off the band, which is the relationship
 * the design actually draws. At each frame's own height it
 * reproduces Figma's absolute y exactly — 212 / 297 / 231 against Figma's
 * 212 / 297 / 231 — because those numbers were never anything but the leftovers.
 *
 * The wave is the live component in place of Figma's flattened render of it; see
 * `wave-field.tsx` for how its colours and pitch were recovered from that render.
 */

/**
 * Figma's `overlay` (2391:4827 / 4859 / 4900) is one 1280x832 gradient dropped at
 * a different offset in each frame, which is why its stop percentages differ
 * frame to frame while the pixels do not. Resolved back to absolute distances
 * from the bottom edge it is the same idea three times: the field fades out over
 * a stretch and then holds solid `#002fff` behind the band. Those two distances
 * are the only things that change, so they are the only things stated.
 */
const FADE_FILL =
  "linear-gradient(to top, #002fff 0, #002fff var(--fade-solid), transparent 100%)";

export const SectionHero = () => (
  <main className="animate-hero-reveal relative isolate flex min-h-dvh w-full flex-col overflow-hidden bg-[#002fff]">
    <WaveField />

    <div
      aria-hidden
      style={{ backgroundImage: FADE_FILL }}
      className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-[567px] [--fade-solid:266px] ipad:h-[629px] ipad:[--fade-solid:264px] desktop-sm:h-[416px] desktop-sm:[--fade-solid:116px]"
    />

    {/* Rails — inset from the *stage* edge, not the viewport, so past 1920 they
        stay 48px off the copy rather than tracking the screen and leaving the
        content floating unrailed in the middle. They run the full height and are
        simply covered at the top by the opaque nav, exactly as Figma stacks them. */}
    <div
      aria-hidden
      className="pointer-events-none absolute inset-y-0 left-1/2 z-[2] w-full max-w-[1920px] -translate-x-1/2"
    >
      <span className="absolute inset-y-0 left-[16px] w-px bg-white/40 ipad:left-[48px]" />
      <span className="absolute inset-y-0 right-[16px] w-px bg-white/40 ipad:right-[48px]" />
    </div>

    <Navbar />

    {/* The one flexible band. Bottom-aligned, so a viewport taller than the frame
        grows the wave field above the headline rather than the gap below it. */}
    <div
      className={`${STAGE} z-10 flex flex-col justify-end min-h-[449px] ipad:min-h-[470px] desktop-sm:min-h-[429px] px-[20px] ipad:px-[56px]`}
    >
      {/*
        The break is unconditional — all three frames read "Your Front Desk," /
        "Powered by AI" — so it is a `<br />` rather than a width that happens to
        wrap there, which would drift with the font's own metrics.

        Tracking is Figma's -2.88 / -4.8 / -6px, which is exactly -0.06em at
        48 / 80 / 100px. Stating it once as the ratio keeps it correct between
        the breakpoints too, where a px value tuned for one size is not.

        The phone size is Figma's 48px held by a clamp rather than stated flat.
        402 is the narrowest frame the design gives, and at 48px the first line
        needs every pixel of it — below ~400 it breaks into four lines and the
        shape of the headline goes with it. 12vw reaches 48 at exactly 402, so
        the clamp is inert at and above the frame width and only does anything
        on the phones the design never drew.
      */}
      <h1 className="mb-[191px] font-helvetica text-[clamp(36px,12vw,48px)] leading-[1.1] tracking-[-0.06em] text-white ipad:mb-[56px] ipad:text-[80px] desktop-sm:text-[100px]">
        Your Front Desk,
        <br />
        Powered by AI
      </h1>
    </div>

    <InfoBand />

    {/* Figma leaves the band clear of the frame's bottom edge — the rails carry
        on past it, so the gap is part of the design rather than slack. */}
    <div
      aria-hidden
      className="h-[40px] shrink-0 ipad:h-[22px] desktop-sm:h-[24px]"
    />
  </main>
);
