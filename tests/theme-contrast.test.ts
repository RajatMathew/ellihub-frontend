import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, test } from 'bun:test';

import {
  contrastRatio,
  parseHexColor,
  relativeLuminance,
  WCAG_AA_NORMAL_TEXT,
} from '../src/app/lib/contrast';

/**
 * The priority ramp is the only colour in the system that is read as *text* at
 * 12px — the `P1` / `P2` / `P3` label on a task card and on the mail add-task
 * chips — rather than as a dot, a bar or a fill. Muted was the design intent
 * and still is; illegible was not. The gold measured 3.10:1 on the editorial
 * chip, well under AA, which is what elli-ui#994 was looking at.
 *
 * These assertions are what stops the ramp being "softened" back under the line
 * the next time it looks a shade heavy on a white card.
 */

const THEMES = ['light', 'editorial', 'dark', 'dark-blue'] as const;

const PRIORITY_TOKENS = ['--priority-high', '--priority-medium', '--priority-low'] as const;

/**
 * Tailwind's own palette vars, which the theme files reference but do not
 * define. Only the handful the grounds below actually resolve to.
 */
const TAILWIND_PALETTE: Record<string, string> = {
  '--color-white': '#ffffff',
  '--color-zinc-100': '#f4f4f5',
  '--color-zinc-800': '#27272a',
};

function themeSource(theme: string): string {
  return readFileSync(
    path.join(import.meta.dir, '..', 'src', 'app', 'styles', 'themes', `${theme}.css`),
    'utf8'
  );
}

/** Every `--token: value;` declaration in a theme file, last one winning. */
function declarations(theme: string): Map<string, string> {
  const found = new Map<string, string>();

  for (const match of themeSource(theme).matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    found.set(match[1]!, match[2]!.trim());
  }

  return found;
}

/**
 * Follow `var(--x)` chains to a literal. Returns `null` for anything that is
 * not ultimately a hex — a `color-mix()`, an `oklch()` — so a caller skips it
 * rather than measuring a value it cannot compute.
 */
function resolve(tokens: Map<string, string>, name: string, depth = 0): string | null {
  if (depth > 10) return null;

  const value = tokens.get(name) ?? TAILWIND_PALETTE[name];

  if (!value) return null;

  const reference = value.match(/^var\(\s*(--[\w-]+)\s*\)$/);

  if (reference) return resolve(tokens, reference[1]!, depth + 1);

  return parseHexColor(value) ? value : null;
}

describe('contrast maths', () => {
  test('reads the three hex spellings and rejects what it cannot measure', () => {
    expect(parseHexColor('#fff')).toEqual({ r: 255, g: 255, b: 255 });
    expect(parseHexColor('#f4f4f5')).toEqual({ r: 244, g: 244, b: 245 });
    expect(parseHexColor('#f4f4f5ff')).toEqual({ r: 244, g: 244, b: 245 });

    // A theme file is full of these, and scoring one as black would invent a
    // passing ratio for a colour nobody checked.
    expect(parseHexColor('color-mix(in oklab, var(--a) 50%, var(--b))')).toBeNull();
    expect(parseHexColor('oklch(94% 0.004 286.32)')).toBeNull();
    expect(relativeLuminance('var(--muted)')).toBeNull();
    expect(contrastRatio('#000000', 'not a colour')).toBeNull();
  });

  test('matches the WCAG reference points', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1, 5);
    // Order is not supposed to matter.
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 5);
    // The documented measurement in the `--link` comment in `light.css`.
    expect(contrastRatio('#0e7490', '#ffffff')).toBeCloseTo(5.36, 1);
  });
});

describe('priority ramp legibility', () => {
  for (const theme of THEMES) {
    const tokens = declarations(theme);

    // `--card` is the task card; `--mail-chip` is the fill a selected priority
    // chip takes in the mail add-task popover. A P-label is only ever drawn on
    // one of the two.
    for (const ground of ['--card', '--mail-chip'] as const) {
      for (const token of PRIORITY_TOKENS) {
        test(`${theme}: ${token} clears AA on ${ground}`, () => {
          const foreground = resolve(tokens, token);
          const background = resolve(tokens, ground);

          expect(foreground).not.toBeNull();
          expect(background).not.toBeNull();

          const ratio = contrastRatio(foreground!, background!);

          expect(ratio).not.toBeNull();
          expect(ratio!).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT);
        });
      }
    }

    test(`${theme}: the ramp is still three distinct steps`, () => {
      const ramp = PRIORITY_TOKENS.map((token) => resolve(tokens, token));

      expect(new Set(ramp).size).toBe(3);
    });
  }

  test('the ramp stays muted rather than being fixed by going black', () => {
    // The point of #994 was legibility, not turning three colours into ink.
    // Anything at or under this luminance has stopped being a hue.
    for (const theme of THEMES) {
      const tokens = declarations(theme);

      for (const token of PRIORITY_TOKENS) {
        const value = resolve(tokens, token)!;
        const { r, g, b } = parseHexColor(value)!;

        expect(Math.max(r, g, b) - Math.min(r, g, b)).toBeGreaterThan(20);
      }
    }
  });
});
