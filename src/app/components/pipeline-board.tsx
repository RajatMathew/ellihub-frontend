/**
 * PipelineBoard — generic status-column board layout used by every
 * "pipeline" view across the app (RFQs, POs, SCOs, Invoices, PCOs,
 * Monthly Bills). Modules pass:
 *   - `columns`: ordered list of status buckets (key + label + optional count)
 *   - `groupOf(item)`: classifier that maps each record into one column
 *   - `renderCard(item)`: card body for a single record
 *
 * Visual: editorial navy column headers, cream paper backdrop, white cards,
 * sharp 2px corners. Matches the existing Project portfolio division board so
 * the entire app reads as one system.
 */
import { useMemo, type ReactNode } from 'react';

import { cn } from '@/app/lib/utils';

export interface PipelineColumn<TKey extends string = string> {
  key: TKey;
  label: string;
  /** Optional override for column accent dot color (any CSS color string). */
  accent?: string;
}

interface PipelineBoardProps<TItem, TKey extends string> {
  items: ReadonlyArray<TItem>;
  columns: ReadonlyArray<PipelineColumn<TKey>>;
  groupOf: (item: TItem) => TKey;
  renderCard: (item: TItem) => ReactNode;
  /** Optional formatter for empty-column placeholder text. */
  emptyLabel?: string;
  className?: string;
  /** Minimum width per column in px (governs horizontal scroll on narrow viewports). */
  minColumnWidth?: number;
}

export function PipelineBoard<TItem, TKey extends string>({
  items,
  columns,
  groupOf,
  renderCard,
  emptyLabel = 'No items',
  className,
  minColumnWidth = 260,
}: PipelineBoardProps<TItem, TKey>) {
  const grouped = useMemo(() => {
    const map = new Map<TKey, TItem[]>();
    for (const col of columns) map.set(col.key, []);
    for (const item of items) {
      const key = groupOf(item);
      const bucket = map.get(key);
      if (bucket) bucket.push(item);
    }
    return map;
  }, [items, columns, groupOf]);

  return (
    <div className={cn('-mx-4 overflow-x-auto px-4 lg:-mx-7.5 lg:px-7.5', className)}>
      <div
        className="grid gap-x-5 gap-y-3"
        style={{
          gridTemplateColumns: `repeat(${columns.length}, minmax(${minColumnWidth}px, 1fr))`,
          minWidth: columns.length * minColumnWidth,
        }}
      >
        {columns.map((col) => {
          const bucket = grouped.get(col.key) ?? [];
          return (
            <div key={col.key} className="flex min-w-0 flex-col">
              <div className="mb-3 flex items-center justify-between gap-3 rounded-sm bg-[#1a3a5f] px-3 py-2">
                <h3 className="flex min-w-0 items-center gap-2 truncate text-xs font-semibold uppercase tracking-[0.18em] text-[#E0A94D]">
                  {col.accent && (
                    <span
                      aria-hidden="true"
                      className="size-1.5 shrink-0 rounded-[2px]"
                      style={{ backgroundColor: col.accent }}
                    />
                  )}
                  {col.label}
                </h3>
                <span className="shrink-0 text-xs font-semibold tabular-nums text-[#E0A94D]/80">
                  {bucket.length}
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {bucket.length === 0 ? (
                  <div className="rounded-sm border border-dashed border-[#a09683]/60 bg-card/40 px-3 py-6 text-center text-xs text-muted-foreground">
                    {emptyLabel}
                  </div>
                ) : (
                  bucket.map((item, index) => (
                    <div key={index} className="min-w-0">
                      {renderCard(item)}
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
