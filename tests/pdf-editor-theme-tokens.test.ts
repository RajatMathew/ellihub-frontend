import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, test } from 'bun:test';

import {
  contrastRatio,
  parseHexColor,
  WCAG_AA_LARGE_TEXT,
  WCAG_AA_NORMAL_TEXT,
} from '../src/app/lib/contrast';

/**
 * The PDF editor's canvas takes every colour it draws from the active theme,
 * so a theme missing one of these tokens does not fail — it falls back to the
 * editor's own built-in dark palette and renders a slab of Figma blue in the
 * middle of an emerald page. That is the failure these guard against.
 *
 * Five of the ten are a special case: `@scena/react-ruler` paints the ruler
 * strip into a `<canvas>` element, so those five are read with
 * `getComputedStyle` and handed to a 2D context as strings. A context accepts
 * a colour; it does not accept a layered `var()` chain it cannot see, and a
 * value it fails to parse is dropped silently — an invisible ruler, with
 * nothing in the console.
 */

const THEMES = ['light', 'editorial', 'dark', 'dark-blue'] as const;

/** Read through `var()` in a stylesheet, so they may be anything CSS accepts. */
const SLOT_TOKENS = [
  '--slot-highlight',
  '--slot-highlight-strong',
  '--slot-highlight-edge',
  '--slot-placeholder',
] as const;

/** Resolved in JS and painted into a `<canvas>`; see the note above. */
const PAINTED_TOKENS = [
  '--slot-selection',
  '--ruler',
  '--ruler-tick',
  '--ruler-text',
  '--ruler-highlight',
] as const;

/** The workspace behind the page, used as a Tailwind utility (`bg-canvas`). */
const CANVAS_TOKEN = '--canvas';

/**
 * Tailwind's own palette vars, which the theme files reference but do not
 * define. Only the handful the tokens below actually resolve to — the same
 * arrangement, and the same reason, as `theme-contrast.test.ts`.
 */
const TAILWIND_PALETTE: Record<string, string> = {
  '--color-white': '#ffffff',
  '--color-zinc-100': '#f4f4f5',
  '--color-zinc-200': '#e4e4e7',
  '--color-zinc-400': '#a1a1aa',
  '--color-zinc-500': '#71717a',
  '--color-zinc-600': '#52525b',
  '--color-emerald-100': '#d1fae5',
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
 * Every value a `var()` chain passes through, starting with the token's own.
 *
 * Returned as a list rather than just the endpoint because what matters for
 * the painted tokens is that *nothing* along the way is a `color-mix()` — a
 * mix three links down reaches the canvas exactly as one written here does.
 * Stops where a reference leaves this stylesheet, which is why the palette
 * above exists.
 */
function chain(tokens: Map<string, string>, name: string): string[] {
  const seen: string[] = [];

  for (let current = name, depth = 0; depth <= 10; depth += 1) {
    const value = tokens.get(current) ?? TAILWIND_PALETTE[current];

    if (!value) break;

    seen.push(value);

    const reference = value.match(/^var\(\s*(--[\w-]+)\s*\)$/);

    if (!reference) break;

    current = reference[1]!;
  }

  return seen;
}

/** The literal a chain ends on, or `null` when it is not a hex colour. */
function resolveHex(tokens: Map<string, string>, name: string): string | null {
  const values = chain(tokens, name);
  const last = values.at(-1);

  return last && parseHexColor(last) ? last : null;
}

describe('the editor is themed by every theme', () => {
  const ALL_TOKENS = [...SLOT_TOKENS, ...PAINTED_TOKENS, CANVAS_TOKEN];

  for (const theme of THEMES) {
    const tokens = declarations(theme);

    test(`${theme} declares all ${ALL_TOKENS.length} of the editor's tokens`, () => {
      const missing = ALL_TOKENS.filter((token) => !tokens.has(token));

      expect(missing).toEqual([]);
    });

    for (const token of PAINTED_TOKENS) {
      test(`${theme}: ${token} reaches the canvas as a colour`, () => {
        const values = chain(tokens, token);

        // An unresolvable first link means the token is missing entirely,
        // which the test above reports more clearly than this one would.
        expect(values.length).toBeGreaterThan(0);

        for (const value of values) {
          expect(value).not.toContain('color-mix(');
        }
      });
    }
  }
});

describe('the ruler can be read', () => {
  for (const theme of THEMES) {
    const tokens = declarations(theme);

    test(`${theme}: the ruler's numbers clear AA on its strip`, () => {
      // These are ~10px digits. Small text is exactly the case AA's 4.5:1 is
      // written for, and a ruler whose numbers cannot be read is a strip of
      // decoration.
      const text = resolveHex(tokens, '--ruler-text');
      const strip = resolveHex(tokens, '--ruler');

      expect(text).not.toBeNull();
      expect(strip).not.toBeNull();
      expect(contrastRatio(text!, strip!)!).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT);
    });

    test(`${theme}: the ticks are visible against the strip`, () => {
      // A tick is a hairline, not text, so the 3:1 WCAG asks of a graphical
      // object is the right bar -- but it is a bar. Both themes started out
      // under it (2.3:1), which is a ruler you measure against by guessing.
      const tick = resolveHex(tokens, '--ruler-tick');
      const strip = resolveHex(tokens, '--ruler');

      expect(tick).not.toBeNull();
      expect(strip).not.toBeNull();
      expect(contrastRatio(tick!, strip!)!).toBeGreaterThanOrEqual(WCAG_AA_LARGE_TEXT);
    });

    test(`${theme}: the workspace is not the colour of the page`, () => {
      // The page is a white sheet with no border of its own: the only thing
      // showing where it ends is that the workspace behind it is a different
      // colour. `--canvas: white` would make the page edge disappear.
      const canvas = resolveHex(tokens, CANVAS_TOKEN);

      expect(canvas).not.toBeNull();
      expect(contrastRatio(canvas!, '#ffffff')!).toBeGreaterThan(1.1);
    });
  }
});
