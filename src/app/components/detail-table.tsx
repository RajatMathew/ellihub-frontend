import type { ReactNode } from 'react';

import { cn } from '@/app/lib/utils';

/**
 * A static table for detail pages: line items, deliverables, a quote breakdown.
 *
 * Not the list kit. These tables do not paginate, sort, filter or select, so
 * `DataTable` is the wrong tool — but they were each hand-writing `<table>` with
 * their own header typography, their own cell padding and their own alignment,
 * which is how the app ended up with two table visual languages. This one takes
 * its spacing and colour from the same tokens the data grid uses, so a line-item
 * table and a resource list read as the same kind of object.
 *
 * @example
 * <DetailTable
 *   ariaLabel="Line items"
 *   columns={[
 *     { key: 'index', header: '#', width: 'w-8' },
 *     { key: 'description', header: 'Description' },
 *     { key: 'amount', header: 'Amount', align: 'end' },
 *   ]}
 *   rows={items}
 *   getRowId={(item) => item.id}
 *   renderCell={(item, key, index) => …}
 * />
 */

export interface DetailTableColumn {
  key: string;
  header: ReactNode;
  /** Applies to the header and every cell in the column. */
  align?: 'start' | 'center' | 'end';
  /** A width utility, e.g. `w-8` or `min-w-40`. */
  width?: string;
  /** Hidden below `sm`. For columns a narrow screen can do without. */
  hideOnMobile?: boolean;
}

export interface DetailTableProps<TRow> {
  /** Accessible name for the table. Required, as everywhere else. */
  ariaLabel: string;
  columns: DetailTableColumn[];
  rows: TRow[];
  getRowId: (row: TRow, index: number) => string;
  renderCell: (row: TRow, columnKey: string, index: number) => ReactNode;
  /** A totals row, or anything else that belongs under the body. */
  footer?: ReactNode;
  /** Shown in place of the body when there are no rows. */
  empty?: ReactNode;
  className?: string;
}

const alignClasses = {
  start: 'text-start',
  center: 'text-center',
  end: 'text-end',
} as const;

export function DetailTable<TRow>({
  ariaLabel,
  columns,
  rows,
  getRowId,
  renderCell,
  footer,
  empty,
  className,
}: DetailTableProps<TRow>) {
  if (rows.length === 0 && empty) {
    return <div className="py-6 text-center text-sm text-muted-foreground">{empty}</div>;
  }

  return (
    <div className={cn('w-full overflow-x-auto [scrollbar-gutter:stable]', className)}>
      <table aria-label={ariaLabel} className="w-full min-w-max text-left text-sm rtl:text-right">
        <thead>
          <tr className="bg-muted/40">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cn(
                  'h-10 px-4 align-middle text-[0.8125rem] font-normal text-accent-foreground',
                  alignClasses[column.align ?? 'start'],
                  column.width,
                  column.hideOnMobile && 'hidden sm:table-cell'
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={getRowId(row, index)} className="border-b border-border last:border-0">
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={cn(
                    'px-4 py-3 align-middle',
                    alignClasses[column.align ?? 'start'],
                    column.width,
                    column.hideOnMobile && 'hidden sm:table-cell'
                  )}
                >
                  {renderCell(row, column.key, index)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {footer && <tfoot className="border-t border-border font-medium">{footer}</tfoot>}
      </table>
    </div>
  );
}
