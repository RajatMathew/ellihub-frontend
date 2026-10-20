/**
 * A cell's text as Excel displays it, number format applied. ExcelTS's
 * formatter does the number and date work, but two things it gets wrong are
 * fixed here, because both show up in every accounting-formatted estimate:
 *
 * - A currency code such as `[$$-409]` is dropped, so `$ 1,234` loses its `$`.
 *   It is rewritten into the quoted literal `"$"`, which the formatter handles.
 * - A text value's section (`_-@_ `, `"Item: "@`) is printed literally, so a
 *   header reads `_-UNIT PRICE_`. Text sections are applied here instead.
 *
 * The formatter is passed in, so this file stays out of the bundle with
 * ExcelTS and can be tested without it.
 */

export type NumberFormatter = (value: Date | number | boolean | string, format: string) => string;

/** Splits a format into its `;` sections, leaving quoted and escaped semicolons alone. */
export function formatSections(format: string): string[] {
  const sections: string[] = [];
  let current = '';
  let quoted = false;
  for (let index = 0; index < format.length; index += 1) {
    const char = format[index]!;
    if (char === '"') quoted = !quoted;
    if (char === '\\' && !quoted && index + 1 < format.length) {
      current += char + format[index + 1];
      index += 1;
      continue;
    }
    if (char === ';' && !quoted) {
      sections.push(current);
      current = '';
      continue;
    }
    current += char;
  }
  sections.push(current);
  return sections;
}

/** `[$$-409]` → `"$"`, `[$€-x-euro]` → `"€"`, `[$-409]` → nothing. Colors and conditions are left alone. */
export function normalizeCurrencyCodes(format: string): string {
  return format.replace(/\[\$([^\]-]*)(?:-[^\]]*)?\]/g, (_match, symbol: string) =>
    symbol ? `"${symbol.replace(/"/g, '')}"` : ''
  );
}

/**
 * Applies a format's text section to a text value: the fourth section, or the
 * only one when it holds `@`. `_x` is a space as wide as `x`, which a space
 * stands in for; `*x` repeats `x` to fill the cell, which a preview leaves
 * out. A format with no text section shows the text unchanged, as Excel does.
 */
export function formatText(text: string, format: string | undefined): string {
  if (!format) return text;
  const sections = formatSections(format);
  const section = sections.length >= 4 ? sections[3] : sections.length === 1 ? sections[0] : '';
  if (!section || !section.includes('@')) return text;

  let result = '';
  for (let index = 0; index < section.length; index += 1) {
    const char = section[index]!;
    if (char === '"') {
      const end = section.indexOf('"', index + 1);
      result += section.slice(index + 1, end === -1 ? undefined : end);
      index = end === -1 ? section.length : end;
    } else if (char === '\\') {
      result += section[index + 1] ?? '';
      index += 1;
    } else if (char === '_') {
      result += ' ';
      index += 1;
    } else if (char === '*') {
      index += 1;
    } else if (char === '[') {
      // A color or locale code: `[Red]`, `[$-409]`.
      const end = section.indexOf(']', index);
      index = end === -1 ? section.length : end;
    } else if (char === '@') {
      result += text;
    } else {
      result += char;
    }
  }
  return result;
}

/** A number or date in its format, with currency codes the formatter would drop made literal. */
export function formatNumber(
  value: number | Date,
  format: string | undefined,
  formatter: NumberFormatter
): string {
  return formatter(
    value,
    !format || format === 'General' ? 'General' : normalizeCurrencyCodes(format)
  );
}
