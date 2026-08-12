// Delivered by Originkit · stack: nextjs · styling: tailwind
"use client";

import { Button } from "@/components/originkit/ui/hero-37/button";

function asset(file: string) {
  return `/originkit/hero-37/${file}`;
}

/**
 * Hero copy — Figma 1457:1529 (mobile), 1457:1372 (tablet), 1457:1175 (desktop).
 *
 * A centred column flanked by two waveform plates from `ipad:` up. The plates
 * are laid out as siblings in the same row rather than as absolute decoration,
 * because that is what holds them against the copy as the column re-pitches:
 * Figma's own row is 149.829 + copy + 149.829 on the tablet and 157 + copy + 157
 * on desktop, and the copy is what changes width between them.
 *
 * Type is restated per frame rather than scaled. The headline runs 46 / 58 / 62
 * against tracking -1.38 / -1.74 / -1.86, which is -0.03em at all three — one
 * ratio, so it is written as the ratio and only the size moves.
 */
export const HeroCopy = () => (
  <div className="flex items-center justify-center">
    <WaveformPlate side="left" />

    <div className="flex shrink-0 flex-col items-center gap-[24.87px] ipad:gap-[30.538px] desktop-sm:gap-[32px]">
      <div className="flex flex-col items-center gap-[9.326px] text-center text-[#121212] ipad:gap-[11.452px] desktop-sm:gap-[12px]">
        {/*
          The break after "Connected." is Figma's, held at every frame — the
          line is `whitespace-nowrap` there, so the column never sets it.
        */}
        <h1 className="font-instrument-serif text-[46px] leading-[1.1] tracking-[-0.03em] whitespace-nowrap ipad:text-[58px] desktop-sm:text-[62px]">
          Everything Connected.
          <br />
          Nothing Missed.
        </h1>

        {/*
          Widths are Figma's own (309.324 / 379.822 / 398) rather than a max —
          they are what set the two-line wrap, and the sub reads as one balanced
          block only at those measures.
        */}
        <p className="w-[309.324px] font-tight text-[16px] leading-[normal] tracking-[-0.32px] opacity-60 ipad:w-[379.822px] ipad:text-[17px] ipad:leading-[21.95px] ipad:tracking-[-0.34px] desktop-sm:w-[398px] desktop-sm:text-[18px] desktop-sm:leading-[23px] desktop-sm:tracking-[-0.36px]">
          AstraCore connects every tool your team uses, so work flows naturally
          from idea to execution.
        </p>
      </div>

      <div className="flex items-center gap-[15.269px] desktop-sm:gap-[16px]">
        <Button>Contact Sale</Button>
        <Button variant="secondary">Explore Now</Button>
      </div>
    </div>

    <WaveformPlate side="right" />
  </div>
);

/**
 * Figma draws each of these as ~150 stacked 1px vectors ("Fluktuasi Suara")
 * inside an elliptical mask. That is a flattened waveform, not a live one, so it
 * ships as the export — one 45KB SVG a side against 300 nodes in the tree — and
 * the ellipse that masks it is baked into the same file rather than costing a
 * second layer. It is absent from the phone frame entirely.
 */
const WaveformPlate = ({ side }: { side: "left" | "right" }) => (
  <img
    src={asset(`waveform-${side}.svg`)}
    alt=""
    aria-hidden
    className="hidden h-[397px] w-[149.829px] max-w-none shrink-0 ipad:block desktop-sm:h-[416px] desktop-sm:w-[157px]"
  />
);
