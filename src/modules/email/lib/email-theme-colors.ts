import type { ThemeColorParams } from '@/modules/email/lib/email-renderer/browser';
import {
  normalizeRGBA,
  rgbaToOklch,
  type RGBA,
} from '@/modules/email/lib/email-renderer/core/colors';

/**
 * The theme Macro's colour adaptation needs, read from our tokens.
 *
 * Macro builds this from its own theme (`rendering-adapter.ts`): ink is
 * `content-0`, panel is `surface-1`, accent is `accent`. Ours are the mail
 * reader's tokens — the message card is `--mail-card`, its text `--mail-ink`.
 * Macro paints every chromatic link in the accent, so ours is `--mail-link`:
 * with `--primary` the links took the button colour and read as body text
 * (#1296), and the app-wide `--link` teal did not read as a link either.
 */
const EMAIL_THEME_TOKENS = {
  ink: '--mail-ink',
  panel: '--mail-card',
  accent: '--mail-link',
  // accent: '--link', — the app-wide teal; mail links are blue now.
  // accent: '--primary', — Macro's `accent`; links came out navy or emerald.
} as const;

/** Light defaults, used when the tokens cannot be read (no canvas, detached). */
export const FALLBACK_EMAIL_THEME: ThemeColorParams = {
  inkL: 0.2,
  inkC: 0,
  inkH: 0,
  panelL: 0.98,
  // The light theme's --mail-link, #2563eb (blue-600).
  accentL: 0.546,
  accentC: 0.215,
  accentH: 262.9,
};

/** Channels 0–255, as a canvas reads them back. */
export function toEmailThemeParams(colors: {
  ink: RGBA;
  panel: RGBA;
  accent: RGBA;
}): ThemeColorParams | null {
  const ink = rgbaToOklch(normalizeRGBA(colors.ink));
  const panel = rgbaToOklch(normalizeRGBA(colors.panel));
  const accent = rgbaToOklch(normalizeRGBA(colors.accent));
  if (!ink || !panel || !accent) return null;

  return {
    inkL: ink.l,
    inkC: ink.c,
    inkH: ink.h,
    panelL: panel.l,
    accentL: accent.l,
    accentC: accent.c,
    accentH: accent.h,
  };
}

/**
 * Resolve the tokens as they apply at `scope`, for whichever theme is active.
 *
 * Our themes mix hex, `oklch()` and `var()` chains, so nothing here parses a
 * colour string. The browser resolves the token on a probe element, and a 1px
 * canvas turns whatever format that comes back in into sRGB bytes.
 */
export function readEmailTheme(scope: Element): ThemeColorParams {
  const context = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  if (!context) return FALLBACK_EMAIL_THEME;

  const probe = document.createElement('span');
  probe.style.display = 'none';
  scope.append(probe);

  try {
    const read = (token: string): RGBA => {
      probe.style.color = `var(${token})`;
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = getComputedStyle(probe).color;
      context.fillRect(0, 0, 1, 1);
      const [r = 0, g = 0, b = 0, a = 255] = context.getImageData(0, 0, 1, 1).data;
      return { r, g, b, a: a / 255 };
    };

    return (
      toEmailThemeParams({
        ink: read(EMAIL_THEME_TOKENS.ink),
        panel: read(EMAIL_THEME_TOKENS.panel),
        accent: read(EMAIL_THEME_TOKENS.accent),
      }) ?? FALLBACK_EMAIL_THEME
    );
  } finally {
    probe.remove();
  }
}
