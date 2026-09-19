/**
 * WCAG 2.1 relative luminance and contrast ratio.
 *
 * Exists so a colour token can be *measured* rather than eyeballed. The theme
 * files already claim ratios in prose (see the `--link` comment in
 * `styles/themes/light.css`); this is what lets a test hold them to it.
 *
 * https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 */

/** Smallest ratio that clears WCAG AA for normal-size body text. */
export const WCAG_AA_NORMAL_TEXT = 4.5;

/** Smallest ratio that clears WCAG AA for large text and UI glyphs. */
export const WCAG_AA_LARGE_TEXT = 3;

/**
 * Parse `#rgb`, `#rrggbb` or `#rrggbbaa` into 0-255 channels.
 *
 * Returns `null` for anything else — `oklch(...)`, `var(--x)` or a colour
 * keyword — so a caller can skip values it cannot measure rather than
 * silently scoring them as black.
 */
export function parseHexColor(value: string): { r: number; g: number; b: number } | null {
  const hex = value.trim().replace(/^#/, '');

  if (!/^(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(hex)) return null;

  const pairs =
    hex.length <= 4
      ? hex
          .slice(0, 3)
          .split('')
          .map((character) => character + character)
      : [hex.slice(0, 2), hex.slice(2, 4), hex.slice(4, 6)];

  const [r, g, b] = pairs.map((pair) => Number.parseInt(pair, 16));

  return { r: r!, g: g!, b: b! };
}

/** The WCAG linearisation of a single 0-255 sRGB channel. */
function linearizeChannel(channel: number): number {
  const ratio = channel / 255;

  return ratio <= 0.04045 ? ratio / 12.92 : ((ratio + 0.055) / 1.055) ** 2.4;
}

/** Relative luminance of a hex colour, 0 (black) to 1 (white). */
export function relativeLuminance(hex: string): number | null {
  const rgb = parseHexColor(hex);

  if (!rgb) return null;

  return (
    0.2126 * linearizeChannel(rgb.r) +
    0.7152 * linearizeChannel(rgb.g) +
    0.0722 * linearizeChannel(rgb.b)
  );
}

/**
 * Contrast ratio between two hex colours, 1 (identical) to 21 (black on
 * white). Order does not matter. `null` when either colour is not a hex value.
 */
export function contrastRatio(foreground: string, background: string): number | null {
  const a = relativeLuminance(foreground);
  const b = relativeLuminance(background);

  if (a === null || b === null) return null;

  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);

  return (lighter + 0.05) / (darker + 0.05);
}
