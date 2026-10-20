import { describe, expect, test } from 'bun:test';

import { parseThemeColors } from '../src/modules/files/lib/spreadsheet/cell-style';
import {
  drawingExtent,
  parseDrawing,
  parseRelationships,
  relsPathFor,
  resolveDrawingColor,
  resolvePartPath,
  type DrawingShape,
  type DrawingTheme,
} from '../src/modules/files/lib/spreadsheet/drawing';
import { readSheetDrawings } from '../src/modules/files/lib/spreadsheet/sheet-drawings';
import { anchorBox, type SheetLayout } from '../src/modules/files/lib/spreadsheet/sheet-layout';

const THEME: DrawingTheme = {
  colors: parseThemeColors(undefined),
  minorFont: 'Calibri',
  majorFont: 'Calibri Light',
};

const NS =
  'xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';

const point = (tag: string, col: number, colOff: number, row: number, rowOff: number) =>
  `<xdr:${tag}><xdr:col>${col}</xdr:col><xdr:colOff>${colOff}</xdr:colOff><xdr:row>${row}</xdr:row><xdr:rowOff>${rowOff}</xdr:rowOff></xdr:${tag}>`;

/** A text box as Excel writes the cover blocks of an estimate sheet. */
const TEXT_BOX = `<xdr:twoCellAnchor>${point('from', 2, 95250, 13, 0)}${point('to', 5, 0, 15, 0)}
<xdr:sp macro="" textlink=""><xdr:nvSpPr><xdr:cNvPr id="2" name="TextBox 1"/><xdr:cNvSpPr txBox="1"/></xdr:nvSpPr>
<xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="100" cy="100"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
  <a:solidFill><a:schemeClr val="accent1"><a:lumMod val="20000"/><a:lumOff val="80000"/></a:schemeClr></a:solidFill>
  <a:ln w="19050"><a:solidFill><a:schemeClr val="lt1"><a:shade val="50000"/></a:schemeClr></a:solidFill></a:ln></xdr:spPr>
<xdr:style><a:lnRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:lnRef><a:fillRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:fillRef><a:effectRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:effectRef><a:fontRef idx="minor"><a:schemeClr val="dk1"/></a:fontRef></xdr:style>
<xdr:txBody><a:bodyPr anchor="ctr" lIns="0"/><a:lstStyle/>
  <a:p><a:pPr algn="ctr"/><a:r><a:rPr lang="en-US" sz="1800" b="1" u="sng"><a:latin typeface="Times New Roman"/></a:rPr><a:t>OWNER</a:t></a:r></a:p>
  <a:p><a:endParaRPr lang="en-US" sz="1400"/></a:p>
  <a:p><a:r><a:rPr lang="en-US" sz="1400" strike="sngStrike"><a:solidFill><a:srgbClr val="FF0000"/></a:solidFill></a:rPr><a:t>BID DATE:\t\t</a:t></a:r><a:br/><a:r><a:t>Second line</a:t></a:r></a:p>
</xdr:txBody></xdr:sp><xdr:clientData/></xdr:twoCellAnchor>`;

const PICTURE = `<xdr:oneCellAnchor>${point('from', 5, 0, 56, 9525)}<xdr:ext cx="952500" cy="476250"/>
<xdr:pic><xdr:nvPicPr><xdr:cNvPr id="3" name="Picture 2" descr="Company logo"/><xdr:cNvPicPr/></xdr:nvPicPr>
<xdr:blipFill><a:blip r:embed="rId7"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill>
<xdr:spPr><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:oneCellAnchor>`;

const GROUP = `<xdr:twoCellAnchor>${point('from', 0, 0, 0, 0)}${point('to', 4, 0, 4, 0)}
<xdr:grpSp><xdr:nvGrpSpPr><xdr:cNvPr id="4" name="Group 3"/><xdr:cNvGrpSpPr/></xdr:nvGrpSpPr>
<xdr:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="400" cy="400"/><a:chOff x="1000" y="1000"/><a:chExt cx="400" cy="400"/></a:xfrm></xdr:grpSpPr>
<xdr:sp><xdr:nvSpPr><xdr:cNvPr id="5" name="Oval"/><xdr:cNvSpPr/></xdr:nvSpPr>
  <xdr:spPr><a:xfrm><a:off x="1200" y="1000"/><a:ext cx="200" cy="100"/></a:xfrm><a:prstGeom prst="ellipse"><a:avLst/></a:prstGeom><a:noFill/></xdr:spPr></xdr:sp>
<xdr:graphicFrame macro=""><xdr:nvGraphicFramePr><xdr:cNvPr id="6" name="Chart"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr></xdr:graphicFrame>
</xdr:grpSp><xdr:clientData/></xdr:twoCellAnchor>`;

function rels(media: Record<string, string> = {}, links: Record<string, string> = {}) {
  return { media: new Map(Object.entries(media)), links: new Map(Object.entries(links)) };
}

/** A text box whose run links out, and a logo whose whole picture does, as Excel writes them. */
const LINKS = `<xdr:twoCellAnchor>${point('from', 0, 0, 0, 0)}${point('to', 3, 0, 3, 0)}
<xdr:sp><xdr:nvSpPr><xdr:cNvPr id="8" name="TextBox 7"/><xdr:cNvSpPr txBox="1"/></xdr:nvSpPr><xdr:spPr/>
<xdr:txBody><a:bodyPr/><a:p>
  <a:r><a:rPr><a:hlinkClick r:id="rId1"/></a:rPr><a:t>support@truebiddata.com</a:t></a:r>
  <a:r><a:rPr><a:hlinkClick r:id="rId2"/></a:rPr><a:t>run me</a:t></a:r>
</a:p></xdr:txBody></xdr:sp><xdr:clientData/></xdr:twoCellAnchor>
<xdr:oneCellAnchor>${point('from', 5, 0, 5, 0)}<xdr:ext cx="9525" cy="9525"/>
<xdr:pic><xdr:nvPicPr><xdr:cNvPr id="9" name="Logo"><a:hlinkClick r:id="rId3"/></xdr:cNvPr><xdr:cNvPicPr/></xdr:nvPicPr>
<xdr:blipFill><a:blip r:embed="rId7"/></xdr:blipFill><xdr:spPr/></xdr:pic><xdr:clientData/></xdr:oneCellAnchor>`;

const drawingXml = (body: string) =>
  `<?xml version="1.0" encoding="UTF-8"?><xdr:wsDr ${NS}>${body}</xdr:wsDr>`;

describe('drawing colors', () => {
  const color = (inner: string) =>
    resolveDrawingColor(
      new DOMParser().parseFromString(
        `<a:solidFill xmlns:a="urn:a">${inner}</a:solidFill>`,
        'application/xml'
      ).documentElement,
      THEME
    );

  test('lumMod / lumOff lighten a theme accent, as Excel’s "Lighter 80%" swatch does', () => {
    expect(
      color(
        '<a:schemeClr val="accent1"><a:lumMod val="20000"/><a:lumOff val="80000"/></a:schemeClr>'
      )
    ).toBe('#dae3f3');
  });

  test('bg1 / tx1 are the light and dark slots; shade darkens', () => {
    expect(color('<a:schemeClr val="bg1"/>')).toBe('#ffffff');
    expect(color('<a:schemeClr val="tx1"/>')).toBe('#000000');
    expect(color('<a:schemeClr val="lt1"><a:shade val="50000"/></a:schemeClr>')).toBe('#808080');
  });

  test('reads srgb, system, preset and scRGB colors, and rejects nonsense', () => {
    expect(color('<a:srgbClr val="1F4E78"/>')).toBe('#1f4e78');
    expect(color('<a:sysClr val="windowText" lastClr="000000"/>')).toBe('#000000');
    expect(color('<a:prstClr val="red"/>')).toBe('#ff0000');
    expect(color('<a:scrgbClr r="100000" g="0" b="0"/>')).toBe('#ff0000');
    expect(color('<a:srgbClr val="nope"/>')).toBeUndefined();
  });
});

describe('parseDrawing', () => {
  test('reads a text box: anchor, fill, outline, alignment and every run’s formatting', () => {
    const [shape] = parseDrawing(drawingXml(TEXT_BOX), rels(), THEME) as DrawingShape[];
    expect(shape).toMatchObject({
      kind: 'shape',
      anchor: {
        from: { col: 2, row: 13, colOffPx: 10, rowOffPx: 0 },
        to: { col: 5, row: 15, colOffPx: 0, rowOffPx: 0 },
      },
      geometry: 'rect',
      fill: '#dae3f3',
      line: { widthPx: 2, color: '#808080', dashed: false },
      vertical: 'middle',
      wrap: true,
    });
    // An explicit inset wins; the rest are DrawingML's defaults (0.1" / 0.05").
    expect(shape!.insetsPx).toEqual({ left: 0, top: 4.8, right: 9.6, bottom: 4.8 });

    const [title, empty, body] = shape!.paragraphs;
    expect(title).toEqual({
      align: 'center',
      runs: [
        {
          text: 'OWNER',
          bold: true,
          underline: true,
          sizePt: 18,
          color: '#000000',
          font: 'Times New Roman',
        },
      ],
    });
    // An empty paragraph keeps its line height.
    expect(empty).toEqual({ align: 'left', runs: [], emptySizePt: 14 });
    // Unformatted runs take the shape's defaults: body font, 11pt, the style's font color.
    expect(body!.runs).toEqual([
      { text: 'BID DATE:\t\t', strike: true, sizePt: 14, color: '#ff0000', font: 'Calibri' },
      { text: '\n', sizePt: 11, color: '#000000', font: 'Calibri' },
      { text: 'Second line', sizePt: 11, color: '#000000', font: 'Calibri' },
    ]);
  });

  test('reads a picture and resolves its image through the relationships', () => {
    const items = parseDrawing(drawingXml(PICTURE), rels({ rId7: 'xl/media/image1.png' }), THEME);
    expect(items).toEqual([
      {
        kind: 'picture',
        anchor: {
          from: { col: 5, row: 56, colOffPx: 0, rowOffPx: 1 },
          sizePx: { width: 100, height: 50 },
        },
        mediaPath: 'xl/media/image1.png',
        line: undefined,
        rotationDeg: 0,
        description: 'Company logo',
      },
    ]);
  });

  test('a picture whose image is missing is left out rather than drawn broken', () => {
    expect(parseDrawing(drawingXml(PICTURE), rels(), THEME)).toEqual([]);
  });

  test('places a grouped shape inside its group’s box, and skips charts', () => {
    const items = parseDrawing(drawingXml(GROUP), rels(), THEME);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      kind: 'shape',
      geometry: 'ellipse',
      fill: undefined,
      anchor: { frame: { left: 0.5, top: 0, width: 0.5, height: 0.25 } },
    });
  });

  test('links on a run and on a whole picture are clickable; a `javascript:` one is not', () => {
    const items = parseDrawing(
      drawingXml(LINKS),
      rels(
        { rId7: 'xl/media/image1.png' },
        {
          rId1: 'mailto:support@truebiddata.com',
          rId2: 'javascript:alert(1)',
          rId3: 'http://www.truebiddata.com',
        }
      ),
      THEME
    );
    const [box, logo] = items;
    const [mail, script] = (box as DrawingShape).paragraphs[0]!.runs;
    expect(mail!.href).toBe('mailto:support@truebiddata.com');
    expect(script!.href).toBeUndefined();
    expect(logo).toMatchObject({ kind: 'picture', href: 'http://www.truebiddata.com/' });
  });

  test('an unreadable part yields no drawings instead of throwing', () => {
    expect(parseDrawing('<xdr:wsDr', rels(), THEME)).toEqual([]);
    expect(parseDrawing(undefined, rels(), THEME)).toEqual([]);
  });

  test('the furthest anchor extends the sheet’s used range', () => {
    const items = parseDrawing(
      drawingXml(TEXT_BOX + PICTURE),
      rels({ rId7: 'xl/media/image1.png' }),
      THEME
    );
    expect(drawingExtent(items)).toEqual({ rows: 57, cols: 6 });
  });
});

describe('package paths', () => {
  test('resolves relationship targets against their part', () => {
    expect(resolvePartPath('xl/drawings/drawing1.xml', '../media/image1.png')).toBe(
      'xl/media/image1.png'
    );
    expect(resolvePartPath('xl/workbook.xml', 'worksheets/sheet1.xml')).toBe(
      'xl/worksheets/sheet1.xml'
    );
    expect(resolvePartPath('xl/workbook.xml', '/xl/worksheets/sheet2.xml')).toBe(
      'xl/worksheets/sheet2.xml'
    );
    expect(relsPathFor('xl/worksheets/sheet1.xml')).toBe('xl/worksheets/_rels/sheet1.xml.rels');
  });

  test('skips external targets such as a text box’s hyperlink', () => {
    const rels = parseRelationships(
      `<Relationships xmlns="urn:r"><Relationship Id="rId1" Type="hyperlink" Target="http://example.com" TargetMode="External"/><Relationship Id="rId2" Type="image" Target="../media/a.png"/></Relationships>`,
      'xl/drawings/drawing1.xml'
    );
    expect([...rels]).toEqual([['rId2', 'xl/media/a.png']]);
  });
});

describe('readSheetDrawings', () => {
  /** A minimal workbook package, as the zip reader would serve it. */
  function packageOf(files: Record<string, string | Uint8Array>) {
    return {
      text: async (path: string) => {
        const file = files[path];
        return typeof file === 'string' ? file : undefined;
      },
      bytes: async (path: string) => {
        const file = files[path];
        return file instanceof Uint8Array ? file : undefined;
      },
    };
  }

  const files = {
    'xl/workbook.xml': `<workbook xmlns="urn:m" xmlns:r="urn:r"><sheets><sheet name="Cover" sheetId="1" r:id="rId1"/><sheet name="Plain" sheetId="2" r:id="rId2"/></sheets></workbook>`,
    'xl/_rels/workbook.xml.rels': `<Relationships xmlns="urn:p"><Relationship Id="rId1" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Target="worksheets/sheet2.xml"/></Relationships>`,
    'xl/worksheets/sheet1.xml': `<worksheet xmlns="urn:m" xmlns:r="urn:r"><sheetData/><drawing r:id="rId3"/><legacyDrawingHF r:id="rId4"/></worksheet>`,
    'xl/worksheets/_rels/sheet1.xml.rels': `<Relationships xmlns="urn:p"><Relationship Id="rId3" Target="../drawings/drawing1.xml"/><Relationship Id="rId4" Target="../drawings/vmlDrawing1.vml"/></Relationships>`,
    'xl/worksheets/sheet2.xml': `<worksheet xmlns="urn:m"><sheetData/></worksheet>`,
    'xl/drawings/drawing1.xml': drawingXml(TEXT_BOX + PICTURE),
    'xl/drawings/_rels/drawing1.xml.rels': `<Relationships xmlns="urn:p"><Relationship Id="rId7" Target="../media/image1.png"/></Relationships>`,
    'xl/media/image1.png': new Uint8Array([137, 80, 78, 71]),
  };

  test('follows workbook → sheet → drawing → image, by sheet name', async () => {
    const drawings = await readSheetDrawings(packageOf(files), THEME);
    expect([...drawings.keys()]).toEqual(['Cover']);
    const cover = drawings.get('Cover')!;
    expect(cover.items.map((item) => item.kind)).toEqual(['shape', 'picture']);
    // A data: URL, not an object URL — nothing for StrictMode's practice unmount to revoke.
    expect(cover.images.get('xl/media/image1.png')).toBe('data:image/png;base64,iVBORw==');
  });

  test('a picture in a format an <img> cannot show (EMF) is dropped', async () => {
    const drawings = await readSheetDrawings(
      packageOf({
        ...files,
        'xl/drawings/_rels/drawing1.xml.rels': `<Relationships xmlns="urn:p"><Relationship Id="rId7" Target="../media/image1.emf"/></Relationships>`,
        'xl/media/image1.emf': new Uint8Array([1]),
      }),
      THEME
    );
    expect(drawings.get('Cover')?.items.map((item) => item.kind)).toEqual(['shape']);
  });
});

describe('anchorBox', () => {
  // Columns 0–2 drawn 100px wide where Excel drew them 80px (a wider fallback
  // font); column 1 hidden; rows 20px. Positions as the table measured them.
  const layout: SheetLayout = {
    cols: new Map([
      [0, { start: 44, size: 100, excelSize: 80 }],
      [2, { start: 144, size: 100, excelSize: 80 }],
    ]),
    rows: new Map([
      [0, { start: 20, size: 20, excelSize: 20 }],
      [1, { start: 40, size: 40, excelSize: 20 }],
      [2, { start: 80, size: 20, excelSize: 20 }],
    ]),
    colOrder: [0, 2],
    rowOrder: [0, 1, 2],
  };
  const at = (col: number, colOffPx: number, row: number, rowOffPx: number) => ({
    col,
    colOffPx,
    row,
    rowOffPx,
  });

  test('stretches offsets into a cell by how much wider or taller it was drawn', () => {
    expect(anchorBox(layout, { from: at(0, 40, 1, 10), to: at(2, 40, 2, 10) })).toEqual({
      left: 44 + 50,
      top: 40 + 20,
      width: 144 + 50 - (44 + 50),
      height: 80 + 10 - 60,
    });
  });

  test('a point in a hidden column collapses onto the next drawn one', () => {
    expect(anchorBox(layout, { from: at(1, 30, 0, 0), to: at(2, 0, 1, 0) })?.left).toBe(144);
  });

  test('a one-cell anchor keeps its own size; a group member takes its share of the box', () => {
    expect(anchorBox(layout, { from: at(0, 0, 0, 0), sizePx: { width: 30, height: 10 } })).toEqual({
      left: 44,
      top: 20,
      width: 30,
      height: 10,
    });
    expect(
      anchorBox(layout, {
        from: at(0, 0, 0, 0),
        to: at(2, 0, 2, 0),
        frame: { left: 0.5, top: 0, width: 0.5, height: 0.5 },
      })
    ).toEqual({ left: 94, top: 20, width: 50, height: 30 });
  });

  test('an end past the drawn area is clamped to it; a start past it is not drawn', () => {
    expect(anchorBox(layout, { from: at(0, 0, 0, 0), to: at(9, 0, 99, 0) })).toEqual({
      left: 44,
      top: 20,
      width: 200,
      height: 80,
    });
    expect(anchorBox(layout, { from: at(0, 0, 50, 0), to: at(2, 0, 60, 0) })).toBeUndefined();
  });
});
