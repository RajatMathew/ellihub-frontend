/**
 * A cell's formatting, resolved for drawing: ExcelTS hands back each cell's
 * style as it is stored — colors as theme slots, tints and legacy palette
 * indexes — and this turns it into plain CSS-ready values.
 *
 * The input types are written structurally rather than imported from ExcelTS,
 * so the tests can build styles by hand and this file never pulls the library
 * into the bundle.
 */

export type BorderLine = 'solid' | 'dashed' | 'dotted' | 'double';

export interface BorderEdge {
  widthPx: number;
  line: BorderLine;
  color?: string;
}

export interface CellStyle {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  /** CSS color, `#rrggbb`. Absent means Excel's "automatic" (black). */
  color?: string;
  fontSizePt?: number;
  fontFamily?: string;
  fill?: string;
  horizontal?: 'left' | 'center' | 'right' | 'justify';
  vertical?: 'top' | 'middle' | 'bottom';
  wrap?: boolean;
  indent?: number;
  /** Text angle in degrees, counterclockwise: 45 reads up and to the right, -90 top to bottom. */
  rotation?: number;
  /** Letters stacked one above the next, upright (Excel's "Vertical Text"). */
  stacked?: boolean;
  borders?: Partial<Record<'top' | 'right' | 'bottom' | 'left', BorderEdge>>;
}

/** A color as ExcelTS reports it. `tint` and `indexed` arrive at runtime, though its types omit them. */
export interface ColorLike {
  argb?: string;
  theme?: number;
  tint?: number;
  indexed?: number;
}

/** The parts of an ExcelTS `Style` the preview draws. */
export interface StyleLike {
  font?: {
    name?: string;
    size?: number;
    color?: ColorLike;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean | string;
    strike?: boolean;
  };
  fill?: {
    type?: string;
    pattern?: string;
    fgColor?: ColorLike;
    bgColor?: ColorLike;
    stops?: { color?: ColorLike }[];
  };
  border?: Partial<
    Record<'top' | 'right' | 'bottom' | 'left', { style?: string; color?: ColorLike }>
  >;
  alignment?: {
    horizontal?: string;
    vertical?: string;
    wrapText?: boolean;
    indent?: number;
    textRotation?: number | string;
  };
}

/**
 * Free fonts with the same metrics as Office's defaults. Carlito ships with the
 * preview (`@fontsource/carlito`), so a Calibri workbook — Excel's default —
 * lays out at Excel's widths on a machine without Office.
 */
const METRIC_TWINS: Record<string, string> = { calibri: 'Carlito' };
const SERIF = /times|georgia|cambria|garamond|book antiqua|palatino|serif/i;

/** A CSS font stack for a workbook font: the font, its metric twin if it has one, then a generic. */
export function fontStack(font: string | undefined): string | undefined {
  if (!font) return undefined;
  const name = font.replace(/"/g, '');
  const twin = METRIC_TWINS[name.toLowerCase()];
  return [`"${name}"`, twin && `"${twin}"`, SERIF.test(name) ? 'serif' : 'sans-serif']
    .filter(Boolean)
    .join(', ');
}

export interface BaseFont {
  family?: string;
  sizePt?: number;
}

/**
 * The legacy 64-entry palette that `indexed` colors point into. 64 is the
 * system foreground and 65 the system background.
 */
const INDEXED_COLORS = [
  '000000', 'FFFFFF', 'FF0000', '00FF00', '0000FF', 'FFFF00', 'FF00FF', '00FFFF',
  '000000', 'FFFFFF', 'FF0000', '00FF00', '0000FF', 'FFFF00', 'FF00FF', '00FFFF',
  '800000', '008000', '000080', '808000', '800080', '008080', 'C0C0C0', '808080',
  '9999FF', '993366', 'FFFFCC', 'CCFFFF', '660066', 'FF8080', '0066CC', 'CCCCFF',
  '000080', 'FF00FF', 'FFFF00', '00FFFF', '800080', '800000', '008080', '0000FF',
  '00CCFF', 'CCFFFF', 'CCFFCC', 'FFFF99', '99CCFF', 'FF99CC', 'CC99FF', 'FFCC99',
  '3366FF', '33CCCC', '99CC00', 'FFCC00', 'FF9900', 'FF6600', '666699', '969696',
  '003366', '339966', '003300', '333300', '993300', '993366', '333399', '333333',
]; // prettier-ignore

/**
 * The theme's `clrScheme` lists dk1, lt1, dk2, lt2, accent1–6, hlink, folHlink,
 * but a cell's `theme="n"` swaps the first two pairs: 0 is lt1, 1 is dk1.
 */
const THEME_SCHEME_ORDER = [
  'lt1', 'dk1', 'lt2', 'dk2',
  'accent1', 'accent2', 'accent3', 'accent4', 'accent5', 'accent6',
  'hlink', 'folHlink',
]; // prettier-ignore

/** Office's default theme, for a workbook that names theme colors but ships no theme part. */
const DEFAULT_THEME_COLORS = [
  'FFFFFF', '000000', 'E7E6E6', '44546A',
  '4472C4', 'ED7D31', 'A5A5A5', 'FFC000', '5B9BD5', '70AD47',
  '0563C1', '954F72',
]; // prettier-ignore

/**
 * The theme colors in the order a cell's `theme` index counts them, from the
 * theme part's XML (ExcelTS keeps it raw). Falls back to Office's defaults.
 */
export function parseThemeColors(themeXml: unknown): string[] {
  if (typeof themeXml !== 'string') return DEFAULT_THEME_COLORS;
  const doc = new DOMParser().parseFromString(themeXml, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length > 0) return DEFAULT_THEME_COLORS;
  // Matched by local name, so any namespace prefix works. (`getElementsByTagNameNS('*', …)`
  // would too in a browser, but happy-dom returns nothing for it, and the tests run there.)
  const scheme = Array.from(doc.getElementsByTagName('*')).find(
    (el) => el.localName === 'clrScheme'
  );
  if (!scheme) return DEFAULT_THEME_COLORS;
  const child = (parent: Element | undefined, name: string) =>
    parent ? Array.from(parent.children).find((el) => el.localName === name) : undefined;
  return THEME_SCHEME_ORDER.map((name, index) => {
    const entry = child(scheme, name);
    const value =
      child(entry, 'srgbClr')?.getAttribute('val') ??
      child(entry, 'sysClr')?.getAttribute('lastClr');
    return value && /^[0-9a-f]{6}$/i.test(value) ? value : DEFAULT_THEME_COLORS[index]!;
  });
}

export function hexToRgb(hex: string): [number, number, number] {
  const value = parseInt(hex.replace(/^#/, ''), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

export function rgbToHex([r, g, b]: [number, number, number]): string {
  const channel = (n: number) => Math.round(Math.min(255, Math.max(0, n)));
  return `#${[r, g, b].map((n) => channel(n).toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Re-light a color in HSL, keeping hue and saturation: `lightness` maps the
 * color's lightness (0–1) to the new one. Excel's cell tints and DrawingML's
 * `lumMod` / `lumOff` are both this.
 */
export function adjustLightness(hex: string, lightness: (l: number) => number): string {
  const [r, g, b] = hexToRgb(hex).map((n) => n / 255) as [number, number, number];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  let l = (max + min) / 2;
  const d = max - min;
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  l = Math.min(1, Math.max(0, lightness(l)));

  const hueToChannel = (p: number, q: number, t: number) => {
    const u = t < 0 ? t + 1 : t > 1 ? t - 1 : t;
    if (u < 1 / 6) return p + (q - p) * 6 * u;
    if (u < 1 / 2) return q;
    if (u < 2 / 3) return p + (q - p) * (2 / 3 - u) * 6;
    return p;
  };
  if (s === 0) return rgbToHex([l * 255, l * 255, l * 255]);
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return rgbToHex([
    hueToChannel(p, q, h + 1 / 3) * 255,
    hueToChannel(p, q, h) * 255,
    hueToChannel(p, q, h - 1 / 3) * 255,
  ]);
}

/**
 * Excel's tint: shift the color's HSL lightness toward black (negative tint) or
 * white (positive), leaving hue and saturation alone.
 */
export function applyTint(hex: string, tint: number): string {
  if (!tint) return `#${hex.toLowerCase()}`;
  return adjustLightness(hex, (l) => (tint < 0 ? l * (1 + tint) : l * (1 - tint) + tint));
}

/** Resolves an ARGB / theme / indexed color, plus tint, to `#rrggbb`. Automatic is `undefined`. */
export function resolveColor(
  color: ColorLike | undefined,
  themeColors: string[]
): string | undefined {
  if (!color) return undefined;
  let hex: string | undefined;
  // ARGB; the alpha byte is unreliable in the wild (ExcelTS reports opaque
  // colors as `00RRGGBB`), so drop it.
  if (color.argb && /^[0-9a-f]{6,8}$/i.test(color.argb)) hex = color.argb.slice(-6);
  else if (color.theme != null) hex = themeColors[color.theme];
  else if (color.indexed != null) hex = INDEXED_COLORS[color.indexed];
  return hex ? applyTint(hex, Number(color.tint) || 0) : undefined;
}

const BORDER_STYLES: Record<string, Omit<BorderEdge, 'color'>> = {
  hair: { widthPx: 1, line: 'dotted' },
  dotted: { widthPx: 1, line: 'dotted' },
  thin: { widthPx: 1, line: 'solid' },
  dashed: { widthPx: 1, line: 'dashed' },
  dashDot: { widthPx: 1, line: 'dashed' },
  dashDotDot: { widthPx: 1, line: 'dashed' },
  medium: { widthPx: 2, line: 'solid' },
  mediumDashed: { widthPx: 2, line: 'dashed' },
  mediumDashDot: { widthPx: 2, line: 'dashed' },
  mediumDashDotDot: { widthPx: 2, line: 'dashed' },
  slantDashDot: { widthPx: 2, line: 'dashed' },
  thick: { widthPx: 3, line: 'solid' },
  double: { widthPx: 3, line: 'double' },
};

const HORIZONTAL: Record<string, CellStyle['horizontal']> = {
  left: 'left',
  center: 'center',
  centerContinuous: 'center',
  right: 'right',
  justify: 'justify',
  distributed: 'justify',
  fill: 'left',
};
const VERTICAL: Record<string, CellStyle['vertical']> = {
  top: 'top',
  middle: 'middle',
  center: 'middle',
  bottom: 'bottom',
  justify: 'middle',
  distributed: 'middle',
};

function fillColor(fill: StyleLike['fill'], themeColors: string[]): string | undefined {
  if (!fill) return undefined;
  if (fill.type === 'gradient') return resolveColor(fill.stops?.[0]?.color, themeColors);
  // gray125 is the reserved second fill every workbook carries; no cell means it.
  if (!fill.pattern || fill.pattern === 'none' || fill.pattern === 'gray125') return undefined;
  return resolveColor(fill.fgColor, themeColors) ?? resolveColor(fill.bgColor, themeColors);
}

/**
 * The style a cell is drawn with. The workbook's base font is left off, since
 * the grid already sets it — ExcelTS repeats it on every cell, and carrying it
 * would only make the markup heavier.
 */
export function toCellStyle(
  style: StyleLike | undefined,
  themeColors: string[],
  baseFont: BaseFont
): CellStyle {
  const result: CellStyle = {};
  if (!style) return result;
  const { font, alignment, border } = style;
  if (font) {
    if (font.bold) result.bold = true;
    if (font.italic) result.italic = true;
    if (font.underline && font.underline !== 'none') result.underline = true;
    if (font.strike) result.strike = true;
    if (font.size && font.size !== baseFont.sizePt) result.fontSizePt = font.size;
    if (font.name && font.name !== baseFont.family) result.fontFamily = font.name;
    const color = resolveColor(font.color, themeColors);
    if (color) result.color = color;
  }
  const fill = fillColor(style.fill, themeColors);
  if (fill) result.fill = fill;
  if (border) {
    const borders: NonNullable<CellStyle['borders']> = {};
    for (const side of ['top', 'right', 'bottom', 'left'] as const) {
      const edge = border[side];
      const kind = BORDER_STYLES[edge?.style ?? ''];
      if (edge && kind) borders[side] = { ...kind, color: resolveColor(edge.color, themeColors) };
    }
    if (Object.keys(borders).length > 0) result.borders = borders;
  }
  if (alignment) {
    const horizontal = HORIZONTAL[alignment.horizontal ?? ''];
    if (horizontal) result.horizontal = horizontal;
    const vertical = VERTICAL[alignment.vertical ?? ''];
    if (vertical) result.vertical = vertical;
    if (alignment.wrapText) result.wrap = true;
    if (alignment.indent && alignment.indent > 0) result.indent = alignment.indent;
    // ExcelTS reports Excel's 255 ("Vertical Text") as `vertical`, and 91–180
    // (angled downward) as -1 to -90.
    const rotation = alignment.textRotation;
    if (rotation === 'vertical') result.stacked = true;
    else if (typeof rotation === 'number' && rotation !== 0 && Math.abs(rotation) <= 90) {
      result.rotation = rotation;
    }
  }
  return result;
}
