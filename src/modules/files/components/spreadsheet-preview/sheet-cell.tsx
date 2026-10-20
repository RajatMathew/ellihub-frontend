import type { CSSProperties, ReactNode } from 'react';

import { cn } from '@/app/lib/utils';
import { linkTarget } from '@/modules/files/lib/file-preview-links';
import type { BorderEdge } from '@/modules/files/lib/spreadsheet/cell-style';
import { cellCss, runCss, type GridCell } from '@/modules/files/lib/spreadsheet/sheet-grid';

function edgeCss(edge: BorderEdge | undefined): string | undefined {
  return edge ? `${edge.widthPx}px ${edge.line} ${edge.color ?? 'var(--sheet-ink)'}` : undefined;
}

function CellText({ cell, hashed }: { cell: GridCell; hashed?: string }) {
  if (hashed) return <>{hashed}</>;
  if (!cell.runs) return <>{cell.text}</>;
  return (
    <>
      {cell.runs.map((run, index) => (
        <span key={index} style={run.style && runCss(run.style)}>
          {run.text}
        </span>
      ))}
    </>
  );
}

/**
 * A linked cell's text as a link. External links open in a new tab and carry
 * no referrer; a link to another sheet switches to its tab. The link takes the
 * cell's own color and underline, as Excel draws it.
 */
function Linked({
  cell,
  onOpenSheet,
  children,
}: {
  cell: GridCell;
  onOpenSheet: (sheet: string) => void;
  children: ReactNode;
}) {
  const { link } = cell;
  if (!link) return <>{children}</>;
  if (link.kind === 'sheet') {
    return (
      <button
        type="button"
        className="cursor-pointer text-left hover:underline"
        title={`Go to ${link.sheet}`}
        onClick={() => onOpenSheet(link.sheet)}
      >
        {children}
      </button>
    );
  }
  return (
    <a
      href={link.href}
      {...linkTarget(link.href)}
      title={link.href}
      className="cursor-pointer hover:underline"
    >
      {children}
    </a>
  );
}

/**
 * Text at an angle, the way Excel draws it: the text turned about its start,
 * and the cell's vertical borders slanted to match, leaning past the cell's
 * top-right corner as Excel's do. 90° text is set vertically instead, and
 * "stacked" text runs downward with its letters upright.
 */
function Rotated({
  cell,
  heightPx,
  children,
}: {
  cell: GridCell;
  heightPx: number;
  children: ReactNode;
}) {
  const { rotation = 0, stacked, borders } = cell.style;
  if (stacked || Math.abs(rotation) === 90) {
    return (
      <span
        className="flex h-full items-center justify-center"
        style={{
          writingMode: 'vertical-rl',
          textOrientation: stacked ? 'upright' : undefined,
          // Upward 90° text reads bottom to top.
          transform: rotation === 90 ? 'rotate(180deg)' : undefined,
        }}
      >
        {children}
      </span>
    );
  }
  const upward = rotation > 0;
  const lean = 90 - Math.abs(rotation);
  // The positioned box is this inner one, never the `<td>`: a positioned cell
  // would paint its fill over the text its left neighbour spills into it.
  // Kept static, every cell's fill paints first, and every angled label and
  // slanted border lands above all of them — as in Excel.
  return (
    <span className="relative block" style={{ height: heightPx }}>
      <span
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute inset-0',
          upward ? 'origin-bottom-left' : 'origin-top-left'
        )}
        style={{
          transform: `skewX(${upward ? -lean : lean}deg)`,
          borderLeft: edgeCss(borders?.left),
          borderRight: edgeCss(borders?.right),
        }}
      />
      <span
        className={cn(
          'absolute left-1/2 whitespace-nowrap',
          upward ? 'bottom-1 origin-bottom-left' : 'top-1 origin-top-left'
        )}
        style={{ transform: `rotate(${-rotation}deg)` }}
      >
        {children}
      </span>
    </span>
  );
}

export function SheetCell({
  cell,
  heightPx,
  hashed,
  showGridLines,
  onOpenSheet,
}: {
  cell: GridCell;
  /** The row's height, which an angled label's box spans. */
  heightPx: number;
  hashed?: string;
  showGridLines: boolean;
  onOpenSheet: (sheet: string) => void;
}) {
  const { rotation, stacked } = cell.style;
  const angled = !!rotation && Math.abs(rotation) < 90 && !stacked;
  const css: CSSProperties = cellCss(cell);
  if (angled) {
    // Drawn slanted by `Rotated` instead.
    delete css.borderLeft;
    delete css.borderRight;
    delete css.borderRightColor;
  }
  const content = (
    <Linked cell={cell} onOpenSheet={onOpenSheet}>
      <CellText cell={cell} hashed={hashed} />
    </Linked>
  );
  return (
    <td
      colSpan={cell.colSpan > 1 ? cell.colSpan : undefined}
      rowSpan={cell.rowSpan > 1 ? cell.rowSpan : undefined}
      className={cn(
        'leading-tight whitespace-nowrap',
        angled ? 'overflow-visible p-0' : 'px-1',
        !angled && (cell.overflow || stacked || rotation ? 'overflow-visible' : 'overflow-hidden'),
        showGridLines &&
          (angled ? 'border-b border-sheet-gridline' : 'border-r border-b border-sheet-gridline')
      )}
      style={css}
      title={hashed ? cell.text : undefined}
    >
      {rotation || stacked ? (
        <Rotated cell={cell} heightPx={heightPx}>
          {content}
        </Rotated>
      ) : (
        content
      )}
    </td>
  );
}
