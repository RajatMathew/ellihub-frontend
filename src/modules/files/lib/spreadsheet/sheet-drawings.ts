import {
  parseDrawing,
  parseRelationships,
  parseXml,
  prefixedAttr,
  readRelationships,
  relsPathFor,
  type DrawingItem,
  type DrawingTheme,
} from './drawing';

/**
 * Finds each sheet's drawing in the package and reads it, with the images it
 * shows: `xl/workbook.xml` names the sheets, their relationships lead to each
 * sheet part, the sheet's `<drawing r:id>` to its drawing, and the drawing's
 * relationships to the images.
 */

export interface PackageReader {
  text: (path: string) => Promise<string | undefined>;
  bytes: (path: string) => Promise<Uint8Array | undefined>;
}

export interface SheetDrawing {
  items: DrawingItem[];
  /**
   * Image part path → `data:` URL, for the pictures in `items`. Data URLs, not
   * object URLs: nothing to revoke, so nothing that React StrictMode's
   * practice unmount can revoke out from under a mounted `<img>`, and they are
   * freed with the workbook.
   */
  images: Map<string, string>;
}

export function toDataUrl(bytes: Uint8Array, type: string): string {
  let binary = '';
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
  }
  return `data:${type};base64,${btoa(binary)}`;
}

/** Image types an `<img>` can show. EMF / WMF / TIFF previews are skipped. */
const IMAGE_TYPES: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  bmp: 'image/bmp',
  webp: 'image/webp',
};

/**
 * The sheet's `<drawing r:id="…">`. Sheet parts can be megabytes, so this is a
 * linear scan for the one tag rather than a DOM of the whole sheet.
 */
function drawingRelationshipId(sheetXml: string): string | undefined {
  const tag = /<(?:\w+:)?drawing\s[^>]*>/.exec(sheetXml)?.[0];
  return tag ? /\s\w+:id="([^"]*)"/.exec(tag)?.[1] : undefined;
}

async function readDrawing(
  pkg: PackageReader,
  drawingPath: string,
  theme: DrawingTheme
): Promise<SheetDrawing> {
  const rels = readRelationships(await pkg.text(relsPathFor(drawingPath)), drawingPath);
  const items = parseDrawing(
    await pkg.text(drawingPath),
    { media: rels.internal, links: rels.external },
    theme
  );
  const images = new Map<string, string>();
  const shown: DrawingItem[] = [];
  for (const item of items) {
    if (item.kind === 'picture') {
      const type = IMAGE_TYPES[item.mediaPath.split('.').pop()?.toLowerCase() ?? ''];
      if (!type) continue;
      if (!images.has(item.mediaPath)) {
        const bytes = await pkg.bytes(item.mediaPath);
        if (!bytes) continue;
        images.set(item.mediaPath, toDataUrl(bytes, type));
      }
    }
    shown.push(item);
  }
  return { items: shown, images };
}

/** Each sheet's drawing, by sheet name. Sheets without one are left out. */
export async function readSheetDrawings(
  pkg: PackageReader,
  theme: DrawingTheme
): Promise<Map<string, SheetDrawing>> {
  const result = new Map<string, SheetDrawing>();
  const workbookPath = 'xl/workbook.xml';
  const workbook = parseXml(await pkg.text(workbookPath));
  if (!workbook) return result;
  const sheetParts = parseRelationships(await pkg.text(relsPathFor(workbookPath)), workbookPath);

  for (const sheet of Array.from(workbook.getElementsByTagName('*'))) {
    if (sheet.localName !== 'sheet') continue;
    const name = sheet.getAttribute('name');
    const id = prefixedAttr(sheet, 'id');
    const sheetPath = id ? sheetParts.get(id) : undefined;
    if (!name || !sheetPath) continue;
    const sheetXml = await pkg.text(sheetPath);
    const drawingId = sheetXml ? drawingRelationshipId(sheetXml) : undefined;
    if (!drawingId) continue;
    const sheetRels = parseRelationships(await pkg.text(relsPathFor(sheetPath)), sheetPath);
    const drawingPath = sheetRels.get(drawingId);
    if (!drawingPath) continue;
    const drawing = await readDrawing(pkg, drawingPath, theme);
    if (drawing.items.length > 0) result.set(name, drawing);
  }
  return result;
}
