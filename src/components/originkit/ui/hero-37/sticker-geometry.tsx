// Delivered by Originkit · stack: nextjs · styling: tailwind
"use client";

/**
 * Sticker geometry, shared between the server components that place the stickers
 * and the client component that mounts them.
 *
 * It lives apart from `sticker.tsx` because that file is `"use client"`, and a
 * function exported from a client module cannot be *called* on the server — only
 * rendered or passed as a prop. The placements are server components, so the
 * helper has to sit outside the boundary.
 */
export type StickerSize = { mobile: number; ipad: number };

export type ShadowRatio = { x: number; y: number; blur: number };

/**
 * Figma's rest shadow, restated as a fraction of the artwork box.
 *
 * It has to be a ratio rather than a length. The shadow is drawn on the card,
 * the canvas is that card's *rotated bounding box*, and the two diverge per
 * sticker — 112 against 150.502 on Notion. Expressed against the box, one
 * statement also covers both frames, because Figma's phone and tablet shadows
 * are the same fraction (4.42/79.023 and 6.265/112 are both 0.0559).
 */
export const shadowRatio = (px: ShadowRatio, box: number): ShadowRatio => ({
  x: px.x / box,
  y: px.y / box,
  blur: px.blur / box,
});
