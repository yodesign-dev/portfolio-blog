// Delivered by Originkit · stack: nextjs · styling: tailwind
"use client";

import { EmailCapture } from "@/components/originkit/ui/hero-31/email-capture";
import { STAGE } from "@/components/originkit/ui/hero-31/stage";

/**
 * The ruled band under the headline — Figma 2391:4837 (mobile),
 * 2391:4868 (tablet), 2391:4916 (desktop).
 *
 * Two cells carrying the same content at every width; only their container
 * changes. Desktop sets them side by side inside one 320px band split by a
 * centre rule. Tablet stacks them as two 290px rows. The phone keeps the second
 * cell as a ruled block but lets the first one go: it drops the "Who We Are:"
 * label, loses its rules, and becomes a plain paragraph sitting above the band.
 *
 * That is one tree, not three, because the rules are borders on the parts rather
 * than a drawn frame. The band owns the outer two — its top rule only exists
 * from `ipad:` up, since on the phone the band starts at the free paragraph —
 * and the second cell owns the rule immediately above itself, which reads as the
 * mid rule when the cells are stacked and is suppressed once they sit in a row.
 *
 * Heights are Figma's, and Figma frames are border-box, so they go on the band
 * on desktop (borders inside the 320) and on the cells when stacked.
 *
 * The band splits the way the nav does: the outer element carries the two rules
 * and runs the full width of the screen, while the cells, the centre divider and
 * the marks sit on the capped stage. Past 1920 the rules keep reaching the edge
 * and the columns stop growing, so the marks stay on the rails instead of the
 * band turning into two very wide, very empty halves.
 */

/**
 * The rule-intersection marks — Figma exports them as a 12px SVG, but the glyph
 * is two 1px white strokes crossing, which two gradients say for nothing.
 */
const PLUS =
  "linear-gradient(#fff,#fff) center / 1px 100% no-repeat, linear-gradient(#fff,#fff) center / 100% 1px no-repeat";

/**
 * Every mark sits where a rule crosses a rail, so it is written as the rail
 * offset with a half-size translate rather than as a measured coordinate — that
 * survives the band being full-bleed at any viewport width. The rails are at
 * 16px on the phone and 48px above it; the third column is the centre divider,
 * which only exists once the cells are side by side.
 */
const RAIL_LEFT = "left-[16px] ipad:left-[48px] -translate-x-1/2";
const RAIL_RIGHT = "right-[16px] ipad:right-[48px] translate-x-1/2";
const RAIL_CENTRE = "left-1/2 -translate-x-1/2 hidden desktop-sm:block";

const Mark = ({ className }: { className: string }) => (
  <span
    aria-hidden
    style={{ background: PLUS }}
    className={`pointer-events-none absolute size-3 ${className}`}
  />
);

const LABEL = "font-tight text-[18px] leading-[1.2] font-medium text-white";

export const InfoBand = () => (
  <section
    aria-label="About Voice AI"
    className="relative z-10 w-full shrink-0 border-b border-white/40 ipad:border-t desktop-sm:h-[320px]"
  >
    <div className={`${STAGE} h-full desktop-sm:flex`}>
      {/* Cell one. On the phone this is just the paragraph in the page gutter —
        no label, no rules, and a 32px foot holding it off the rule below. */}
      <div className="px-[20px] pb-[32px] ipad:flex ipad:h-[290px] ipad:flex-col ipad:justify-between ipad:border-b ipad:border-white/40 ipad:px-[56px] ipad:py-[32px] desktop-sm:h-full desktop-sm:min-w-0 desktop-sm:flex-1 desktop-sm:border-b-0 desktop-sm:border-r desktop-sm:py-[40px]">
        <p className={`hidden ipad:block ${LABEL}`}>Who We Are:</p>
        {/* Figma breaks this into 3 / 3 / 4 lines purely on width, and the same
          break lands at every frame, so the widths hold it. `text-pretty` is
          left off deliberately — it is free to move the last break. */}
        <p className="max-w-[343px] font-helvetica text-[16px] leading-[1.14] text-white ipad:max-w-none ipad:text-[28px] ipad:tracking-[-0.03em] desktop-sm:max-w-[476px]">
          Custom AI voice agents that answer every call, schedule appointments,
          and support patients around the clock, without increasing headcount.
        </p>
      </div>

      {/* Cell two. Its own top rule is the phone's single upper rule and the
        tablet's mid rule; on desktop the band's top rule already covers it. */}
      <div className="relative flex h-[220px] flex-col justify-between border-t border-white/40 p-[20px] ipad:h-[290px] ipad:px-[56px] ipad:py-[32px] desktop-sm:h-full desktop-sm:min-w-0 desktop-sm:flex-1 desktop-sm:border-t-0 desktop-sm:py-[40px]">
        <p className={LABEL}>Healthcare AI Receptionists</p>
        <EmailCapture />

        <Mark
          className={`top-0 -translate-y-1/2 desktop-sm:hidden ${RAIL_LEFT}`}
        />
        <Mark
          className={`top-0 -translate-y-1/2 desktop-sm:hidden ${RAIL_RIGHT}`}
        />
      </div>

      {/* The band's own top rule starts at `ipad:`, so its marks never need the
        phone's 16px rail offset. */}
      <Mark className="top-0 left-[48px] hidden -translate-x-1/2 -translate-y-1/2 ipad:block" />
      <Mark className="top-0 right-[48px] hidden translate-x-1/2 -translate-y-1/2 ipad:block" />
      <Mark className={`top-0 -translate-y-1/2 ${RAIL_CENTRE}`} />

      <Mark className={`bottom-0 translate-y-1/2 ${RAIL_LEFT}`} />
      <Mark className={`bottom-0 translate-y-1/2 ${RAIL_RIGHT}`} />
      <Mark className={`bottom-0 translate-y-1/2 ${RAIL_CENTRE}`} />
    </div>
  </section>
);
