import type { CSSProperties, ReactNode } from 'react';

import { cn } from '@/app/lib/utils';
import { linkTarget } from '@/modules/files/lib/file-preview-links';
import { fontStack } from '@/modules/files/lib/spreadsheet/cell-style';
import type {
  DrawingItem,
  DrawingLine,
  DrawingParagraph,
  DrawingRun,
  DrawingShape,
} from '@/modules/files/lib/spreadsheet/drawing';
import type { SheetDrawing } from '@/modules/files/lib/spreadsheet/sheet-drawings';
import { anchorBox, type SheetLayout } from '@/modules/files/lib/spreadsheet/sheet-layout';

/** DrawingML's default tab stops: every inch. */
const TAB_SIZE = '96px';

function lineCss(line: DrawingLine | undefined): string | undefined {
  return line ? `${line.widthPx}px ${line.dashed ? 'dashed' : 'solid'} ${line.color}` : undefined;
}

/** A text run's formatting. Workbook data, not theme values, so inline. */
function runCss(run: Omit<DrawingRun, 'text'>): CSSProperties {
  const decorations = [run.underline && 'underline', run.strike && 'line-through'].filter(Boolean);
  return {
    fontWeight: run.bold ? 700 : undefined,
    fontStyle: run.italic ? 'italic' : undefined,
    textDecoration: decorations.length ? decorations.join(' ') : undefined,
    fontSize: run.sizePt ? `${run.sizePt}pt` : undefined,
    color: run.color,
    fontFamily: fontStack(run.font),
  };
}

/**
 * A link in the drawing layer. The layer itself ignores the pointer so the
 * grid under it scrolls and selects as usual; a link opts back in. External
 * links only (`safeHref` already vetted them), in a new tab, with no referrer.
 */
function ExternalLink({
  href,
  className,
  style,
  children,
}: {
  href: string;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      {...linkTarget(href)}
      title={href}
      className={cn('pointer-events-auto cursor-pointer hover:underline', className)}
      style={style}
    >
      {children}
    </a>
  );
}

function Paragraph({ paragraph }: { paragraph: DrawingParagraph }) {
  return (
    <p className="m-0 leading-tight" style={{ textAlign: paragraph.align }}>
      {paragraph.runs.length === 0 ? (
        // An empty paragraph still takes a line at its own size.
        <span
          style={{ fontSize: paragraph.emptySizePt ? `${paragraph.emptySizePt}pt` : undefined }}
        >
          {'​'}
        </span>
      ) : (
        paragraph.runs.map((run, index) =>
          run.href ? (
            <ExternalLink key={index} href={run.href} style={runCss(run)}>
              {run.text}
            </ExternalLink>
          ) : (
            <span key={index} style={runCss(run)}>
              {run.text}
            </span>
          )
        )
      )}
    </p>
  );
}

const JUSTIFY: Record<DrawingShape['vertical'], CSSProperties['justifyContent']> = {
  top: 'flex-start',
  middle: 'center',
  bottom: 'flex-end',
};

function Shape({ shape, style }: { shape: DrawingShape; style: CSSProperties }) {
  const radius =
    shape.geometry === 'ellipse' ? '50%' : shape.geometry === 'roundRect' ? '16%' : undefined;
  return (
    <div
      className="absolute flex flex-col overflow-hidden text-sheet-ink"
      style={{
        ...style,
        backgroundColor: shape.fill,
        border: lineCss(shape.line),
        borderRadius: radius,
        justifyContent: JUSTIFY[shape.vertical],
        padding: `${shape.insetsPx.top}px ${shape.insetsPx.right}px ${shape.insetsPx.bottom}px ${shape.insetsPx.left}px`,
        whiteSpace: shape.wrap ? 'pre-wrap' : 'pre',
        tabSize: TAB_SIZE,
      }}
    >
      {shape.paragraphs.map((paragraph, index) => (
        <Paragraph key={index} paragraph={paragraph} />
      ))}
    </div>
  );
}

/**
 * The sheet's text boxes and pictures, drawn over the cells where Excel
 * anchors them. Sits under the sticky row and column headers, and scales with
 * the grid's zoom because it lives inside the same zoomed box.
 */
export function SheetDrawingLayer({
  drawing,
  layout,
}: {
  drawing: SheetDrawing;
  layout: SheetLayout;
}) {
  return (
    <div className="pointer-events-none absolute inset-0 z-0">
      {drawing.items.map((item: DrawingItem, index) => {
        const box = anchorBox(layout, item.anchor);
        if (!box || box.width <= 0 || box.height <= 0) return null;
        const style: CSSProperties = {
          left: box.left,
          top: box.top,
          width: box.width,
          height: box.height,
          transform: item.rotationDeg ? `rotate(${item.rotationDeg}deg)` : undefined,
        };
        if (item.kind === 'shape') {
          const shape = <Shape key={index} shape={item} style={style} />;
          return item.href ? (
            <ExternalLink key={index} href={item.href} className="absolute" style={style}>
              <Shape shape={item} style={{ inset: 0 }} />
            </ExternalLink>
          ) : (
            shape
          );
        }
        const url = drawing.images.get(item.mediaPath);
        if (!url) return null;
        const picture = (
          <img
            src={url}
            alt={item.description ?? ''}
            draggable={false}
            className="absolute max-w-none object-fill"
            style={
              item.href
                ? { inset: 0, width: '100%', height: '100%', border: lineCss(item.line) }
                : { ...style, border: lineCss(item.line) }
            }
          />
        );
        return item.href ? (
          <ExternalLink key={index} href={item.href} className="absolute" style={style}>
            {picture}
          </ExternalLink>
        ) : (
          <span key={index}>{picture}</span>
        );
      })}
    </div>
  );
}
