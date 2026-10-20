import type { RGB } from '@pdf-slot/core';

/**
 * A small fixed palette, Sejda-style. Components are **0–1**, the range
 * `RGB` is defined in (see its doc comment in `@pdf-slot/core`) -- not CSS
 * bytes. A test asserts the range over the whole list.
 *
 * Beside `color-field.tsx` rather than inside it, because a file that
 * exports a component and a constant breaks fast refresh for the component
 * -- the lint rule that says so is on.
 */
export const COLOR_SWATCHES: { label: string; color: RGB }[] = [
  { label: 'Black', color: { r: 0, g: 0, b: 0 } },
  { label: 'White', color: { r: 1, g: 1, b: 1 } },
  { label: 'Red', color: { r: 220 / 255, g: 38 / 255, b: 38 / 255 } },
  { label: 'Orange', color: { r: 234 / 255, g: 88 / 255, b: 12 / 255 } },
  { label: 'Yellow', color: { r: 202 / 255, g: 138 / 255, b: 4 / 255 } },
  { label: 'Green', color: { r: 22 / 255, g: 163 / 255, b: 74 / 255 } },
  { label: 'Blue', color: { r: 37 / 255, g: 99 / 255, b: 235 / 255 } },
  { label: 'Purple', color: { r: 124 / 255, g: 58 / 255, b: 237 / 255 } },
];
