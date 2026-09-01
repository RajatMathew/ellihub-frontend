/**
 * Faithful port of the Fluent UI (Outlook) avatar appearance so senders get the
 * exact same colour and initials here as they do in Outlook.
 *
 * - Colours: the 30 named avatar colours from `@fluentui/react-avatar`, using
 *   the light-theme "colored" tokens (`tint40` background / `shade30` text)
 *   from `@fluentui/tokens`. These are Microsoft's palette values on purpose —
 *   do not swap them for design-system tokens.
 * - Colour choice: Fluent's `getHashCode(name) % colours.length`.
 * - Initials: Fluent's `getInitials` rules — strip bracketed parts and
 *   punctuation, phone numbers get none, 1 word → first initial, 2 words →
 *   both initials, 3 words → first + last, 4+ words → first initial only.
 */

export type OutlookAvatarStyle = {
  backgroundColor: string;
  color: string;
};

const AVATAR_COLORS: ReadonlyArray<OutlookAvatarStyle> = [
  { backgroundColor: '#d69ca5', color: '#420610' }, // dark-red
  { backgroundColor: '#eeacb2', color: '#6e0811' }, // cranberry
  { backgroundColor: '#f1bbbc', color: '#751d1f' }, // red
  { backgroundColor: '#efc4ad', color: '#712d09' }, // pumpkin
  { backgroundColor: '#ffddb3', color: '#8f4e00' }, // peach
  { backgroundColor: '#f9e2ae', color: '#835b00' }, // marigold
  { backgroundColor: '#ecdfa5', color: '#6c5700' }, // gold
  { backgroundColor: '#e0cea2', color: '#553e06' }, // brass
  { backgroundColor: '#ddc3b0', color: '#50301a' }, // brown
  { backgroundColor: '#bdd99b', color: '#294903' }, // forest
  { backgroundColor: '#a8f0cd', color: '#00723b' }, // seafoam
  { backgroundColor: '#9ad29a', color: '#063b06' }, // dark-green
  { backgroundColor: '#a6e9ed', color: '#00666d' }, // light-teal
  { backgroundColor: '#9bd9db', color: '#02494c' }, // teal
  { backgroundColor: '#94c8d4', color: '#00333f' }, // steel
  { backgroundColor: '#a9d3f2', color: '#004377' }, // blue
  { backgroundColor: '#9abfdc', color: '#002c4e' }, // royal-blue
  { backgroundColor: '#c8d1fa', color: '#2c3c85' }, // cornflower
  { backgroundColor: '#a3b2e8', color: '#001665' }, // navy
  { backgroundColor: '#d2ccf8', color: '#3f3682' }, // lavender
  { backgroundColor: '#c6b1de', color: '#341a51' }, // purple
  { backgroundColor: '#d9a7e0', color: '#4c0d55' }, // grape
  { backgroundColor: '#e6bfed', color: '#63276d' }, // lilac
  { backgroundColor: '#f7c0e3', color: '#80215d' }, // pink
  { backgroundColor: '#eca5d1', color: '#6b0043' }, // magenta
  { backgroundColor: '#d696c0', color: '#43002b' }, // plum
  { backgroundColor: '#d7d4d4', color: '#444241' }, // beige
  { backgroundColor: '#cecccb', color: '#343231' }, // mink
  { backgroundColor: '#cdd6d8', color: '#3b4447' }, // platinum
  { backgroundColor: '#bcc3c7', color: '#202427' }, // anchor
];

/** Fluent UI's avatar hash, verbatim. */
const getHashCode = (value: string): number => {
  let hashCode = 0;
  for (let len = value.length - 1; len >= 0; len--) {
    const ch = value.charCodeAt(len);
    const shift = len % 8;
    hashCode ^= (ch << shift) + (ch >> (8 - shift));
  }
  return hashCode;
};

export function getOutlookAvatarStyle(name: string): OutlookAvatarStyle {
  const style = AVATAR_COLORS[getHashCode(name) % AVATAR_COLORS.length];
  return style ?? AVATAR_COLORS[0]!;
}

// Fluent's getInitials cleanup rules, verbatim.
const UNWANTED_ENCLOSURES_REGEX = /[([{][^)\]}]*[)\]}]/g;
// eslint-disable-next-line no-control-regex
const UNWANTED_CHARS_REGEX = /[\0-\u001F!-/:-@[-`{-\u00BF\u0250-\u036F\uE000-\uFFFF]/g;
const PHONENUMBER_REGEX = /^\d+[\d\s]*(:?ext|x|)\s*\d+$/i;
const MULTIPLE_WHITESPACES_REGEX = /\s+/g;
const UNSUPPORTED_TEXT_REGEX =
  /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\u1100-\u11FF\u3130-\u318F\uA960-\uA97F\uAC00-\uD7AF\uD7B0-\uD7FF\u3040-\u309F\u30A0-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/;

const getFirstCodePoint = (value: string): string => {
  if (!value) return '';
  const codePoint = value.codePointAt(0);
  return codePoint === undefined ? '' : String.fromCodePoint(codePoint);
};

export function getOutlookInitials(displayName: string | undefined | null): string {
  const name = (displayName ?? '')
    .replace(UNWANTED_ENCLOSURES_REGEX, '')
    .replace(UNWANTED_CHARS_REGEX, '')
    .replace(MULTIPLE_WHITESPACES_REGEX, ' ')
    .trim();

  if (!name || PHONENUMBER_REGEX.test(name) || UNSUPPORTED_TEXT_REGEX.test(name)) {
    return '';
  }

  const splits = name.split(' ');
  let initials = getFirstCodePoint(splits[0] ?? '').toUpperCase();
  if (splits.length === 2) {
    initials += getFirstCodePoint(splits[1] ?? '').toUpperCase();
  } else if (splits.length === 3) {
    initials += getFirstCodePoint(splits[2] ?? '').toUpperCase();
  }
  return initials;
}
