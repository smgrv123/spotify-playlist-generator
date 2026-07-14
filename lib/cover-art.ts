/**
 * Deep module for playlist cover-art visuals.
 *
 * Exposes two entry points:
 *
 * - `gradientForHue(hue)`: the primitive. A deterministic OKLCH
 *   two-stop `linear-gradient(...)` for a given hue on the 0–359 circle.
 *   Same hue → same gradient string, byte-for-byte.
 * - `coverGradient(seed)`: seed-based public entry point. Hashes any string
 *   deterministically to a hue and delegates to `gradientForHue`. Empty
 *   seeds are safe — they collapse to a stable fallback hue rather than
 *   producing invalid CSS.
 *
 * The two-stop offset (+55°) is preserved from the original `/login` art
 * strip so refactoring login to consume this module doesn't change its
 * visual output.
 */

/**
 * Hue used when no useful seed is available (empty string). Chosen to sit
 * inside the app's accent-green neighborhood so an empty collage still looks
 * on-brand.
 */
const FALLBACK_HUE = 150;

/** Small hash function producing a stable non-negative hue for a seed. */
function hashSeedToHue(seed: string): number {
  if (seed.length === 0) return FALLBACK_HUE;
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (Math.imul(hash, 31) + seed.charCodeAt(i)) | 0;
  }
  return ((hash % 360) + 360) % 360;
}

/**
 * Deterministic two-stop OKLCH `linear-gradient(...)` for a given hue.
 * The secondary hue is offset by 55° so the gradient reads as one family
 * rather than a jarring contrast.
 */
export function gradientForHue(hue: number): string {
  const h2 = (hue + 55) % 360;
  return `linear-gradient(135deg, oklch(0.62 0.17 ${hue}), oklch(0.5 0.16 ${h2}))`;
}

/**
 * Deterministic gradient derived from an arbitrary seed string
 * (e.g. `"${title} ${artist}"`). Suitable as a cover-quadrant fallback
 * when a real album image isn't available.
 */
export function coverGradient(seed: string): string {
  return gradientForHue(hashSeedToHue(seed));
}
