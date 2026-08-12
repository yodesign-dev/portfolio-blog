// Delivered by Originkit · stack: nextjs · styling: tailwind
"use client";

"use client";

import { useEffect, useState } from "react";

import StickerDrag from "@/components/originkit/ui/hero-37/draggable-sticker";
import type { ShadowRatio, StickerSize } from "@/components/originkit/ui/hero-37/sticker-geometry";

function asset(file: string) {
  return `/originkit/hero-37/${file}`;
}

/**
 * One draggable sticker (Figma 1457:1558 and siblings, plus the three cards in
 * the stack at 1457:1600-1615).
 *
 * `StickerDrag` textures a WebGL mesh from a single image, so the card *and* its
 * logo have to arrive as one picture — a CSS plate with an `<img>` on top could
 * not peel. Each `sticker-*.svg` in `assets/` is therefore Figma's
 * card composed with its logo, generated from the ratios that hold at every card
 * size in the design: border 0.0631 of the card, radius 0.2524, logo 0.4643.
 * Only the palette differs — the loose stickers are #f5f5f5 on #fefefd, the
 * stack cards #efeff1 on white.
 *
 * The tilt is baked into that artwork rather than applied as a CSS `rotate`, for
 * the same reason `section-39`'s shuttle is pre-rotated: the component maps the
 * pointer through `getBoundingClientRect`, which reports an axis-aligned box, so
 * under a rotation the peel would run at an angle to the cursor that grabbed it.
 * Rotating the pixels keeps the peel maths exact — and it is why each artwork is
 * the card's *rotated bounding box*, which lands on Figma's own outer box at
 * every sticker (79.382, 78.076, 123.267, 150.502).
 *
 * Size is a numeric prop the component reads in JS, not a CSS length, so it
 * switches on a media query here rather than a Tailwind variant.
 */
const IPAD_MIN = 768;

type StickerProps = {
  /** Artwork slug — `assets/sticker-<name>.svg`. */
  name: string;
  label: string;
  /** Rotated bounding box per frame; the tablet and desktop share one. */
  size: StickerSize;
  /** Rest shadow as a fraction of that box — see `shadowRatio`. */
  shadow: ShadowRatio;
  /** Absolute placement on the stage, per frame. */
  className: string;
};

export const Sticker = ({
  name,
  label,
  size,
  shadow,
  className,
}: StickerProps) => {
  const [box, setBox] = useState<number | null>(null);

  useEffect(() => {
    const tablet = window.matchMedia(`(min-width: ${IPAD_MIN}px)`);
    const sync = () => setBox(tablet.matches ? size.ipad : size.mobile);
    sync();
    tablet.addEventListener("change", sync);
    return () => tablet.removeEventListener("change", sync);
  }, [size.ipad, size.mobile]);

  return (
    <div
      className={`absolute ${className}`}
      style={{ width: box ?? 0, height: box ?? 0 }}
    >
      {/*
        Gated on a resolved size so the canvas never mounts at zero, and keyed on
        it so the mesh is rebuilt rather than stretched when the frame changes.

        The rest shadow is Figma's, resolved against the box — see `shadowRatio`.
        The drag shadow is the component's own: the design has no dragging state
        to match it against.
      */}
      {box !== null && (
        <StickerDrag
          key={box}
          image={{ src: asset(`sticker-${name}.svg`), alt: label }}
          imageWidth={box}
          imageHeight={box}
          tilt={45}
          lighting
          lightingStrength={10}
          lightingColor="#ffffff"
          sheenMode="sheen"
          elevation={10}
          staticShadow={`${(box * shadow.x).toFixed(3)}px ${(box * shadow.y).toFixed(3)}px ${(box * shadow.blur).toFixed(3)}px rgba(0, 0, 0, 0.24)`}
          dynamicShadow="0px 13px 14px 0px rgba(0, 0, 0, 0.30)"
        />
      )}
    </div>
  );
};
