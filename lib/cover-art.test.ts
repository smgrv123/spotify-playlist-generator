import { describe, expect, it } from 'vitest';
import { coverGradient, gradientForHue } from './cover-art';

/**
 * A gradient produced by this module must always be a valid CSS
 * `linear-gradient(...)` value so callers can drop it straight into
 * `background:` without a runtime guard.
 */
const GRADIENT_REGEX = /^linear-gradient\(.+\)$/;

describe('coverGradient', () => {
  it('is deterministic — the same seed yields the same gradient string', () => {
    const seed = 'Midnight Rain — Taylor Swift';
    expect(coverGradient(seed)).toBe(coverGradient(seed));
  });

  it('produces distinct outputs for distinct seeds', () => {
    const a = coverGradient('Alpha — Artist A');
    const b = coverGradient('Beta — Artist B');
    const c = coverGradient('Gamma — Artist C');
    expect(new Set([a, b, c]).size).toBe(3);
  });

  it('produces a valid CSS linear-gradient string for a normal seed', () => {
    expect(coverGradient('any seed value')).toMatch(GRADIENT_REGEX);
  });

  it('returns a valid gradient for an empty seed without throwing', () => {
    const output = coverGradient('');
    expect(output).toMatch(GRADIENT_REGEX);
  });
});

describe('gradientForHue', () => {
  it('is deterministic for a given hue', () => {
    expect(gradientForHue(120)).toBe(gradientForHue(120));
  });

  it('produces a valid CSS linear-gradient string across the hue range', () => {
    expect(gradientForHue(0)).toMatch(GRADIENT_REGEX);
    expect(gradientForHue(180)).toMatch(GRADIENT_REGEX);
    expect(gradientForHue(359)).toMatch(GRADIENT_REGEX);
  });
});
