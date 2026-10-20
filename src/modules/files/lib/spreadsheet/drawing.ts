import { safeHref } from '@/modules/files/lib/file-preview-links';

import { adjustLightness, hexToRgb, rgbToHex } from './cell-style';

/**
 * The drawing layer of a sheet — text boxes, shapes and pictures that float
 * over the cells — read from its DrawingML part (`xl/drawings/drawingN.xml`).
 * ExcelTS reads a file's pictures but not its text boxes, and estimate sheets
 * put their whole cover block in them (title, address, bid details), so the
 * preview reads the part itself.
 *
 * Pure and DOM-only (`DOMParser`), matched by local name so any namespace
 * prefix works and happy-dom can run the tests.
 */

const EMU_PER_PX = 9525;
/** DrawingML's default text insets: 0.1" left/right, 0.05" top/bottom. */
const DEFAULT_INSETS = { left: 91440, top: 45720, right: 91440, bottom: 45720 };

/** A point on the sheet: a cell corner plus an offset into it, in pixels at 100%. */
export interface CellPoint {
  col: number;
  row: number;
  colOffPx: number;
  rowOffPx: number;
}

/**
 * Where a drawing sits. `twoCellAnchor` gives both corners; `oneCellAnchor`
 * a corner and a size. `frame` places a shape inside a group's box, as
 * fractions of it, so a grouped shape stretches with its group.
 */
export interface DrawingAnchor {
  from: CellPoint;
  to?: CellPoint;
  sizePx?: { width: number; height: number };
  frame?: { left: number; top: number; width: number; height: number };
}

export interface DrawingLine {
  widthPx: number;
  color: string;
  dashed: boolean;
}

export interface DrawingRun {
  text: string;
  /** A safe link the run points at (`hlinkClick`). */
  href?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  sizePt?: number;
  color?: string;
  font?: string;
}

export interface DrawingParagraph {
  align: 'left' | 'center' | 'right' | 'justify';
  runs: DrawingRun[];
  /** The size of an empty paragraph's line, which still takes up height. */
  emptySizePt?: number;
}

export interface DrawingShape {
  kind: 'shape';
  anchor: DrawingAnchor;
  /** A link on the whole shape. */
  href?: string;
  geometry: 'rect' | 'roundRect' | 'ellipse';
  fill?: string;
  line?: DrawingLine;
  rotationDeg: number;
  paragraphs: DrawingParagraph[];
  vertical: 'top' | 'middle' | 'bottom';
  insetsPx: { left: number; top: number; right: number; bottom: number };
  wrap: boolean;
}

export interface DrawingPicture {
  kind: 'picture';
  anchor: DrawingAnchor;
  /** A link on the whole picture, such as a company logo pointing at its website. */
  href?: string;
  /** The image's part in the package, e.g. `xl/media/image1.png`. */
  mediaPath: string;
  line?: DrawingLine;
  rotationDeg: number;
  description?: string;
}

export type DrawingItem = DrawingShape | DrawingPicture;

/** The drawing's relationships: image parts, and the external targets its links use. */
export interface DrawingRelationships {
  media: Map<string, string>;
  links: Map<string, string>;
}

/** A `hlinkClick` under `el`'s direct children, resolved to a safe href. */
function linkOf(el: Element | undefined, rels: DrawingRelationships): string | undefined {
  const click = child(el, 'hlinkClick');
  const id = prefixedAttr(click, 'id');
  return id ? safeHref(rels.links.get(id)) : undefined;
}

export interface DrawingTheme {
  /** In the order `parseThemeColors` returns: lt1, dk1, lt2, dk2, accent1–6, hlink, folHlink. */
  colors: string[];
  majorFont?: string;
  minorFont?: string;
}

const SCHEME_INDEX: Record<string, number> = {
  lt1: 0, bg1: 0, dk1: 1, tx1: 1, lt2: 2, bg2: 2, dk2: 3, tx2: 3,
  accent1: 4, accent2: 5, accent3: 6, accent4: 7, accent5: 8, accent6: 9,
  hlink: 10, folHlink: 11,
}; // prettier-ignore

const PRESET_COLORS: Record<string, string> = {
  black: '000000', white: 'FFFFFF', red: 'FF0000', green: '008000', blue: '0000FF',
  yellow: 'FFFF00', gray: '808080', grey: '808080', silver: 'C0C0C0', navy: '000080',
  orange: 'FFA500', purple: '800080',
}; // prettier-ignore

function children(parent: Element | undefined, name: string): Element[] {
  return parent ? Array.from(parent.children).filter((el) => el.localName === name) : [];
}

function child(parent: Element | undefined, name: string): Element | undefined {
  return children(parent, name)[0];
}

function numberAttr(el: Element | undefined, name: string): number | undefined {
  const value = el?.getAttribute(name);
  if (value == null || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/**
 * A namespaced attribute such as `r:id` or `r:embed`, whatever prefix the
 * writer bound. Matched on the qualified name: happy-dom, which the tests run
 * in, leaves the prefix inside `localName`.
 */
export function prefixedAttr(el: Element | undefined, localName: string): string | undefined {
  if (!el) return undefined;
  return Array.from(el.attributes).find((attr) => attr.name.endsWith(`:${localName}`))?.value;
}

export function parseXml(xml: string | undefined): Document | null {
  if (!xml) return null;
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  return doc.getElementsByTagName('parsererror').length > 0 ? null : doc;
}

/** The theme's heading and body fonts, which `+mj-lt` / `+mn-lt` and a shape's default text use. */
export function parseThemeFonts(themeXml: unknown): Pick<DrawingTheme, 'majorFont' | 'minorFont'> {
  const doc = typeof themeXml === 'string' ? parseXml(themeXml) : null;
  if (!doc) return {};
  const find = (name: string) =>
    Array.from(doc.getElementsByTagName('*')).find((el) => el.localName === name);
  const typeface = (name: string) =>
    child(find(name), 'latin')?.getAttribute('typeface') || undefined;
  return { majorFont: typeface('majorFont'), minorFont: typeface('minorFont') };
}

/**
 * A DrawingML color element's parent (`<a:solidFill>`, `<a:fgClr>`, …) to
 * `#rrggbb`, with its `lumMod` / `lumOff` / `shade` / `tint` modifiers. `phClr`
 * is the shape style's placeholder, resolved to `placeholder`.
 */
export function resolveDrawingColor(
  parent: Element | undefined,
  theme: DrawingTheme,
  placeholder?: string
): string | undefined {
  const el = parent ? Array.from(parent.children)[0] : undefined;
  if (!el) return undefined;
  let hex: string | undefined;
  switch (el.localName) {
    case 'srgbClr':
      hex = el.getAttribute('val') ?? undefined;
      break;
    case 'sysClr':
      hex = el.getAttribute('lastClr') ?? undefined;
      break;
    case 'prstClr':
      hex = PRESET_COLORS[el.getAttribute('val') ?? ''];
      break;
    case 'schemeClr': {
      const name = el.getAttribute('val') ?? '';
      if (name === 'phClr') hex = placeholder?.replace(/^#/, '');
      else {
        const index = SCHEME_INDEX[name];
        hex = index == null ? undefined : theme.colors[index];
      }
      break;
    }
    case 'scrgbClr': {
      // Percentages of linear RGB; close enough to sRGB for a preview.
      const channel = (name: string) => ((numberAttr(el, name) ?? 0) / 100000) * 255;
      hex = rgbToHex([channel('r'), channel('g'), channel('b')]).slice(1);
      break;
    }
  }
  if (!hex || !/^[0-9a-f]{6}$/i.test(hex)) return undefined;

  let color = `#${hex.toLowerCase()}`;
  for (const modifier of Array.from(el.children)) {
    const amount = (numberAttr(modifier, 'val') ?? 100000) / 100000;
    switch (modifier.localName) {
      case 'lumMod':
        color = adjustLightness(color, (l) => l * amount);
        break;
      case 'lumOff':
        color = adjustLightness(color, (l) => l + amount);
        break;
      case 'shade':
        color = rgbToHex(hexToRgb(color).map((n) => n * amount) as [number, number, number]);
        break;
      case 'tint':
        color = rgbToHex(
          hexToRgb(color).map((n) => n + (255 - n) * (1 - amount)) as [number, number, number]
        );
        break;
    }
  }
  return color;
}

function readPoint(el: Element | undefined): CellPoint | undefined {
  if (!el) return undefined;
  const col = Number(child(el, 'col')?.textContent);
  const row = Number(child(el, 'row')?.textContent);
  if (!Number.isInteger(col) || !Number.isInteger(row)) return undefined;
  return {
    col,
    row,
    colOffPx: Number(child(el, 'colOff')?.textContent ?? 0) / EMU_PER_PX || 0,
    rowOffPx: Number(child(el, 'rowOff')?.textContent ?? 0) / EMU_PER_PX || 0,
  };
}

function readLine(spPr: Element | undefined, theme: DrawingTheme): DrawingLine | undefined {
  const ln = child(spPr, 'ln');
  if (!ln || child(ln, 'noFill')) return undefined;
  const color = resolveDrawingColor(child(ln, 'solidFill'), theme);
  if (!color) return undefined;
  const dash = child(ln, 'prstDash')?.getAttribute('val');
  return {
    widthPx: Math.max(1, Math.round((numberAttr(ln, 'w') ?? EMU_PER_PX) / EMU_PER_PX)),
    color,
    dashed: !!dash && dash !== 'solid',
  };
}

function readRotation(spPr: Element | undefined): number {
  return (numberAttr(child(spPr, 'xfrm'), 'rot') ?? 0) / 60000;
}

const ALIGN: Record<string, DrawingParagraph['align']> = {
  l: 'left',
  ctr: 'center',
  r: 'right',
  just: 'justify',
  dist: 'justify',
};

function runStyle(rPr: Element | undefined, theme: DrawingTheme): Omit<DrawingRun, 'text'> {
  const run: Omit<DrawingRun, 'text'> = {};
  if (!rPr) return run;
  const flag = (name: string) => {
    const value = rPr.getAttribute(name);
    return value === '1' || value === 'true';
  };
  if (flag('b')) run.bold = true;
  if (flag('i')) run.italic = true;
  const underline = rPr.getAttribute('u');
  if (underline && underline !== 'none') run.underline = true;
  const strike = rPr.getAttribute('strike');
  if (strike && strike !== 'noStrike') run.strike = true;
  const size = numberAttr(rPr, 'sz');
  if (size) run.sizePt = size / 100;
  const color = resolveDrawingColor(child(rPr, 'solidFill'), theme);
  if (color) run.color = color;
  const typeface = child(rPr, 'latin')?.getAttribute('typeface');
  if (typeface === '+mj-lt') run.font = theme.majorFont;
  else if (typeface === '+mn-lt') run.font = theme.minorFont;
  else if (typeface) run.font = typeface;
  return run;
}

function readParagraphs(
  txBody: Element | undefined,
  theme: DrawingTheme,
  defaults: Omit<DrawingRun, 'text'>,
  rels: DrawingRelationships
): DrawingParagraph[] {
  return children(txBody, 'p').map((p) => {
    const runs: DrawingRun[] = [];
    for (const node of Array.from(p.children)) {
      if (node.localName === 'r' || node.localName === 'fld') {
        const text = child(node, 't')?.textContent ?? '';
        const rPr = child(node, 'rPr');
        const href = linkOf(rPr, rels);
        runs.push({ ...defaults, ...runStyle(rPr, theme), text, ...(href && { href }) });
      } else if (node.localName === 'br') {
        runs.push({ ...defaults, ...runStyle(child(node, 'rPr'), theme), text: '\n' });
      }
    }
    const paragraph: DrawingParagraph = {
      align: ALIGN[child(p, 'pPr')?.getAttribute('algn') ?? ''] ?? 'left',
      runs,
    };
    if (runs.length === 0) {
      paragraph.emptySizePt = runStyle(child(p, 'endParaRPr'), theme).sizePt ?? defaults.sizePt;
    }
    return paragraph;
  });
}

const VERTICAL: Record<string, DrawingShape['vertical']> = {
  t: 'top',
  ctr: 'middle',
  b: 'bottom',
};

function readShape(
  sp: Element,
  anchor: DrawingAnchor,
  theme: DrawingTheme,
  rels: DrawingRelationships
): DrawingShape {
  const spPr = child(sp, 'spPr');
  const style = child(sp, 'style');
  // A shape's text defaults to its style's font color and the theme's body font.
  const fontRef = child(style, 'fontRef');
  const defaults: Omit<DrawingRun, 'text'> = {
    sizePt: 11,
    color: resolveDrawingColor(fontRef, theme),
    font: fontRef?.getAttribute('idx') === 'major' ? theme.majorFont : theme.minorFont,
  };
  // An explicit fill wins; otherwise the style's `fillRef` color, unless `idx="0"` (none).
  let fill: string | undefined;
  if (child(spPr, 'solidFill')) fill = resolveDrawingColor(child(spPr, 'solidFill'), theme);
  else if (!child(spPr, 'noFill')) {
    const fillRef = child(style, 'fillRef');
    if (fillRef && fillRef.getAttribute('idx') !== '0') fill = resolveDrawingColor(fillRef, theme);
  }
  let line = readLine(spPr, theme);
  if (!child(spPr, 'ln')) {
    const lnRef = child(style, 'lnRef');
    const color =
      lnRef && lnRef.getAttribute('idx') !== '0' ? resolveDrawingColor(lnRef, theme) : undefined;
    if (color) line = { widthPx: 1, color, dashed: false };
  }

  const txBody = child(sp, 'txBody');
  const bodyPr = child(txBody, 'bodyPr');
  const inset = (name: keyof typeof DEFAULT_INSETS, attr: string) =>
    (numberAttr(bodyPr, attr) ?? DEFAULT_INSETS[name]) / EMU_PER_PX;
  const preset = child(spPr, 'prstGeom')?.getAttribute('prst');
  const href = linkOf(child(child(sp, 'nvSpPr'), 'cNvPr'), rels);
  return {
    kind: 'shape',
    anchor,
    ...(href && { href }),
    geometry: preset === 'ellipse' ? 'ellipse' : preset === 'roundRect' ? 'roundRect' : 'rect',
    fill,
    line,
    rotationDeg: readRotation(spPr),
    paragraphs: readParagraphs(txBody, theme, defaults, rels),
    vertical: VERTICAL[bodyPr?.getAttribute('anchor') ?? ''] ?? 'top',
    insetsPx: {
      left: inset('left', 'lIns'),
      top: inset('top', 'tIns'),
      right: inset('right', 'rIns'),
      bottom: inset('bottom', 'bIns'),
    },
    wrap: bodyPr?.getAttribute('wrap') !== 'none',
  };
}

function readPicture(
  pic: Element,
  anchor: DrawingAnchor,
  theme: DrawingTheme,
  rels: DrawingRelationships
): DrawingPicture | null {
  const blip = Array.from(pic.getElementsByTagName('*')).find((el) => el.localName === 'blip');
  const id = prefixedAttr(blip, 'embed');
  const mediaPath = id ? rels.media.get(id) : undefined;
  if (!mediaPath) return null;
  const spPr = child(pic, 'spPr');
  const nvPr = child(child(pic, 'nvPicPr'), 'cNvPr');
  const href = linkOf(nvPr, rels);
  return {
    kind: 'picture',
    anchor,
    ...(href && { href }),
    mediaPath,
    line: readLine(spPr, theme),
    rotationDeg: readRotation(spPr),
    description: nvPr?.getAttribute('descr') || nvPr?.getAttribute('name') || undefined,
  };
}

interface Box {
  x: number;
  y: number;
  cx: number;
  cy: number;
}

function readBox(xfrm: Element | undefined, offName: string, extName: string): Box | undefined {
  const off = child(xfrm, offName);
  const ext = child(xfrm, extName);
  const cx = numberAttr(ext, 'cx');
  const cy = numberAttr(ext, 'cy');
  if (!off || !cx || !cy) return undefined;
  return { x: numberAttr(off, 'x') ?? 0, y: numberAttr(off, 'y') ?? 0, cx, cy };
}

/**
 * Shapes and pictures under one anchor. A group's children are placed inside
 * the anchor's box by mapping their own coordinates through the group's
 * child extent, as Excel does when the group is resized.
 */
function readItems(
  node: Element,
  anchor: DrawingAnchor,
  theme: DrawingTheme,
  rels: DrawingRelationships
): DrawingItem[] {
  switch (node.localName) {
    case 'sp':
      return [readShape(node, anchor, theme, rels)];
    case 'pic': {
      const picture = readPicture(node, anchor, theme, rels);
      return picture ? [picture] : [];
    }
    case 'grpSp': {
      const xfrm = child(child(node, 'grpSpPr'), 'xfrm');
      const space = readBox(xfrm, 'chOff', 'chExt');
      const outer = anchor.frame ?? { left: 0, top: 0, width: 1, height: 1 };
      return Array.from(node.children).flatMap((member) => {
        if (!['sp', 'pic', 'grpSp'].includes(member.localName)) return [];
        const props = child(member, member.localName === 'grpSp' ? 'grpSpPr' : 'spPr');
        const box = readBox(child(props, 'xfrm'), 'off', 'ext');
        if (!space || !box) return readItems(member, anchor, theme, rels);
        const frame = {
          left: outer.left + ((box.x - space.x) / space.cx) * outer.width,
          top: outer.top + ((box.y - space.y) / space.cy) * outer.height,
          width: (box.cx / space.cx) * outer.width,
          height: (box.cy / space.cy) * outer.height,
        };
        return readItems(member, { ...anchor, frame }, theme, rels);
      });
    }
    default:
      // Charts (`graphicFrame`) and connectors are not drawn.
      return [];
  }
}

/**
 * Everything on a sheet's drawing layer. `rels` maps the drawing's
 * relationship ids to image parts and link targets (see `parseRelationships`).
 */
export function parseDrawing(
  xml: string | undefined,
  rels: DrawingRelationships,
  theme: DrawingTheme
): DrawingItem[] {
  const root = parseXml(xml)?.documentElement;
  if (!root) return [];
  return Array.from(root.children).flatMap((anchorEl) => {
    const from = readPoint(child(anchorEl, 'from'));
    if (!from) return [];
    let anchor: DrawingAnchor;
    if (anchorEl.localName === 'twoCellAnchor') {
      const to = readPoint(child(anchorEl, 'to'));
      if (!to) return [];
      anchor = { from, to };
    } else if (anchorEl.localName === 'oneCellAnchor') {
      const ext = child(anchorEl, 'ext');
      anchor = {
        from,
        sizePx: {
          width: (numberAttr(ext, 'cx') ?? 0) / EMU_PER_PX,
          height: (numberAttr(ext, 'cy') ?? 0) / EMU_PER_PX,
        },
      };
    } else {
      return [];
    }
    return Array.from(anchorEl.children).flatMap((node) => readItems(node, anchor, theme, rels));
  });
}

/** Resolves a relationship target against the part that owns it: `../media/a.png` from `xl/drawings/`. */
export function resolvePartPath(ownerPath: string, target: string): string {
  if (target.startsWith('/')) return target.slice(1);
  const parts = ownerPath.split('/').slice(0, -1);
  for (const segment of target.split('/')) {
    if (segment === '..') parts.pop();
    else if (segment && segment !== '.') parts.push(segment);
  }
  return parts.join('/');
}

/**
 * A part's `.rels`: relationship id → resolved part path for internal targets,
 * and the raw target of external ones (a hyperlink's URL), kept apart so a URL
 * is never mistaken for a part.
 */
export function readRelationships(
  relsXml: string | undefined,
  ownerPath: string
): { internal: Map<string, string>; external: Map<string, string> } {
  const internal = new Map<string, string>();
  const external = new Map<string, string>();
  const root = parseXml(relsXml)?.documentElement;
  for (const rel of root ? Array.from(root.children) : []) {
    const id = rel.getAttribute('Id');
    const target = rel.getAttribute('Target');
    if (!id || !target) continue;
    if (rel.getAttribute('TargetMode') === 'External') external.set(id, target);
    else internal.set(id, resolvePartPath(ownerPath, target));
  }
  return { internal, external };
}

/** Internal targets only: relationship id → resolved part path. */
export function parseRelationships(
  relsXml: string | undefined,
  ownerPath: string
): Map<string, string> {
  return readRelationships(relsXml, ownerPath).internal;
}

/** Where the `.rels` of a part lives: `xl/worksheets/sheet1.xml` → `xl/worksheets/_rels/sheet1.xml.rels`. */
export function relsPathFor(partPath: string): string {
  const slash = partPath.lastIndexOf('/');
  return `${partPath.slice(0, slash + 1)}_rels/${partPath.slice(slash + 1)}.rels`;
}

/** The furthest cell a drawing reaches, so the grid's used range can include it. */
export function drawingExtent(items: DrawingItem[]): { rows: number; cols: number } {
  let rows = 0;
  let cols = 0;
  for (const { anchor } of items) {
    const end = anchor.to ?? anchor.from;
    rows = Math.max(rows, end.row + 1);
    cols = Math.max(cols, end.col + 1);
  }
  return { rows, cols };
}
