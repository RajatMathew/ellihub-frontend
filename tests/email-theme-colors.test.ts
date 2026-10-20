import { describe, expect, test } from 'bun:test';

import {
  FALLBACK_EMAIL_THEME,
  readEmailTheme,
  toEmailThemeParams,
} from '../src/modules/email/lib/email-theme-colors';

describe('toEmailThemeParams', () => {
  test('matches Tailwind’s own oklch values for the light theme tokens', () => {
    // zinc-950 ink, white card, emerald-600 primary — as the canvas reads them.
    const theme = toEmailThemeParams({
      ink: { r: 9, g: 9, b: 11, a: 1 },
      panel: { r: 255, g: 255, b: 255, a: 1 },
      accent: { r: 5, g: 150, b: 105, a: 1 },
    })!;

    expect(theme.inkL).toBeCloseTo(0.141, 2);
    expect(theme.inkH).toBeCloseTo(285.8, 0);
    expect(theme.panelL).toBeCloseTo(1, 3);
    expect(theme.accentL).toBeCloseTo(0.596, 2);
    expect(theme.accentC).toBeCloseTo(0.127, 2);
    expect(theme.accentH).toBeCloseTo(163.2, 0);
  });

  // Macro decides light vs dark by comparing ink with panel.
  test('a dark card with light ink reads as a dark theme', () => {
    const theme = toEmailThemeParams({
      ink: { r: 250, g: 250, b: 250, a: 1 },
      panel: { r: 20, g: 20, b: 20, a: 1 },
      accent: { r: 79, g: 125, b: 168, a: 1 },
    })!;
    expect(theme.inkL).toBeGreaterThan(theme.panelL);
  });
});

describe('readEmailTheme', () => {
  test('falls back to light defaults without a canvas, and leaves no probe behind', () => {
    const scope = document.createElement('div');
    document.body.append(scope);

    expect(readEmailTheme(scope)).toEqual(FALLBACK_EMAIL_THEME);
    expect(scope.childNodes.length).toBe(0);
  });
});
