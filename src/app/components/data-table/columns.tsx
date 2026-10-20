/* eslint-disable react-refresh/only-export-components -- the factories and the
   cells they render belong together, as in ui/data-grid.tsx */

import type { ComponentType, ReactNode } from 'react';

import { StatusBadge } from '@/app/components/status-badge';
import type { StatusTone } from '@/app/components/status-tone';
import { DataGridColumnHeader } from '@/app/components/ui/data-grid-column-header';
import { Skeleton } from '@/app/components/ui/skeleton';
import { cn } from '@/app/lib/utils';
import type { ColumnDef } from '@tanstack/react-table';
import type { LucideProps } from 'lucide-react';
import { Link } from 'react-router-dom';

import { RowActions, type RowAction } from './row-actions';

/**
 * Column widths, as a scale.
 *
 * The column files between them used 28 distinct width values across three
 * parallel systems — 12 `min-w-*`, 9 fixed `w-*` and 7 percentages — so no two
 * lists lined up. Five steps cover every real column; `actions` is fixed because
 * it holds one icon button.
 */
export const COLUMN_WIDTHS = {
  xs: 'min-w-24',
  sm: 'min-w-32',
  md: 'min-w-40',
  lg: 'min-w-56',
  xl: 'min-w-72',
  actions: 'w-16',
} as const;

export type ColumnWidth = keyof typeof COLUMN_WIDTHS;

type Align = 'start' | 'center' | 'end';

interface BaseColumnOptions<TData> {
  /** Header text. Also the accessible name of the sort control. */
  title: string;
  width?: ColumnWidth;
  align?: Align;
  /**
   * Leave unset and the kit decides from the list's declared sort fields — a
   * column can then never render a sort control that does nothing. Set it to
   * `false` to opt a genuinely unsortable column out regardless.
   */
  sortable?: boolean;
  /** Full text for the tooltip when the cell truncates. */
  tooltip?: (row: TData) => ReactNode;
  className?: string;
}

function meta<TData>(
  options: BaseColumnOptions<TData>,
  extra: { skeleton: ReactNode; truncate?: boolean }
) {
  const width = COLUMN_WIDTHS[options.width ?? 'sm'];

  return {
    align: options.align,
    cellClassName: cn(width, options.className),
    headerClassName: cn(width, options.className),
    skeleton: extra.skeleton,
    ...(extra.truncate ? { textOverflow: 'truncate' as const } : {}),
    ...(options.tooltip ? { tooltipContent: options.tooltip } : {}),
  };
}

export interface TextColumnOptions<TData> extends BaseColumnOptions<TData> {
  key: string;
  /** The cell's content. Return a string for the common case. */
  value: (row: TData) => ReactNode;
  /** Second, quieter line under the value. */
  secondary?: (row: TData) => ReactNode;
  /** Skeleton width, in the same scale the cell renders at. */
  skeletonWidth?: string;
}

/** Text, optionally with a quieter second line. The default column. */
export function textColumn<TData>(options: TextColumnOptions<TData>): ColumnDef<TData> {
  return {
    id: options.key,
    accessorKey: options.key,
    header: ({ column }) => <DataGridColumnHeader column={column} title={options.title} />,
    cell: ({ row }) => (
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-sm text-foreground">{options.value(row.original)}</span>
        {options.secondary && (
          <span className="truncate text-xs text-muted-foreground">
            {options.secondary(row.original)}
          </span>
        )}
      </div>
    ),
    enableSorting: options.sortable,
    meta: meta(options, {
      skeleton: options.secondary ? (
        <div className="flex flex-col gap-1.5">
          <Skeleton className={cn('h-3.5', options.skeletonWidth ?? 'w-28')} />
          <Skeleton className="h-3 w-20" />
        </div>
      ) : (
        <Skeleton className={cn('h-3.5', options.skeletonWidth ?? 'w-28')} />
      ),
      truncate: true,
    }),
  };
}

export interface LinkColumnOptions<TData> extends BaseColumnOptions<TData> {
  key: string;
  /** Where the row opens. Relative paths resolve against the list's route. */
  to: (row: TData) => string;
  label: (row: TData) => ReactNode;
  secondary?: (row: TData) => ReactNode;
  skeletonWidth?: string;
  /**
   * An affordance mark after the label. Off by default: a name column is not an
   * identifier, and an arrow on every row of a list whose every row is a link is
   * noise. Set it where a column links somewhere the row itself does not.
   */
  icon?: ComponentType<LucideProps>;
  /**
   * A mark beside the label - "Imported", say. Rendered next to the link, not
   * inside it, so a badge with its own tooltip is not a control within a control.
   */
  badge?: (row: TData) => ReactNode;
}

/**
 * The cell that opens the record.
 *
 * A real `<Link>`, not a row-level click handler: it is reachable by keyboard,
 * it supports middle-click and open-in-new-tab, and a screen reader announces it
 * as a link. Files was the one list navigating by `<tr onClick>` — no `tabIndex`,
 * no key handler — which left its primary action mouse-only.
 */
export function linkColumn<TData>(options: LinkColumnOptions<TData>): ColumnDef<TData> {
  const LinkIcon = options.icon;

  return {
    id: options.key,
    accessorKey: options.key,
    header: ({ column }) => <DataGridColumnHeader column={column} title={options.title} />,
    cell: ({ row }) => {
      const link = (
        <Link
          to={options.to(row.original)}
          // Deliberately NOT `--link`. That token marks an *identifier* — a PO
          // number, an RFQ number — which is a small token of text that has to
          // announce itself as somewhere to go. This column holds the row's
          // name, which is already the most prominent thing in the row; colouring
          // it too would leave a list where everything is a link and nothing
          // stands out. Contacts, GCs and RFQ titles all read this way already.
          className="inline-flex max-w-full items-center gap-1 text-sm font-semibold text-foreground transition-colors hover:text-primary hover:underline"
          onClick={(event) => event.stopPropagation()}
        >
          <span className="truncate">{options.label(row.original)}</span>
          {LinkIcon && (
            <LinkIcon
              aria-hidden="true"
              className="size-3.5 shrink-0 opacity-70"
              strokeWidth={2.5}
            />
          )}
        </Link>
      );
      const badge = options.badge?.(row.original);

      return (
        <div className="flex min-w-0 flex-col gap-0.5">
          {badge ? (
            <div className="flex min-w-0 items-center gap-1.5">
              {link}
              {badge}
            </div>
          ) : (
            link
          )}
          {options.secondary && (
            <span className="truncate text-xs text-muted-foreground">
              {options.secondary(row.original)}
            </span>
          )}
        </div>
      );
    },
    enableSorting: options.sortable,
    meta: meta(options, {
      skeleton: options.secondary ? (
        <div className="flex flex-col gap-1.5">
          <Skeleton className={cn('h-3.5', options.skeletonWidth ?? 'w-28')} />
          <Skeleton className="h-3 w-20" />
        </div>
      ) : (
        <Skeleton className={cn('h-3.5', options.skeletonWidth ?? 'w-28')} />
      ),
      truncate: true,
    }),
  };
}

export interface CurrencyColumnOptions<TData> extends BaseColumnOptions<TData> {
  key: string;
  value: (row: TData) => string;
}

/**
 * Money. Right-aligned and tabular by construction.
 *
 * The alignment is the point: `text-right` in a `headerClassName` is inert on a
 * sortable column, so four currency columns were right-aligned in the body and
 * left-aligned in the head. `align` reaches both.
 */
export function currencyColumn<TData>(options: CurrencyColumnOptions<TData>): ColumnDef<TData> {
  return {
    id: options.key,
    accessorKey: options.key,
    header: ({ column }) => <DataGridColumnHeader column={column} title={options.title} />,
    cell: ({ row }) => (
      <span className="text-sm font-medium tabular-nums text-foreground">
        {options.value(row.original)}
      </span>
    ),
    enableSorting: options.sortable,
    meta: meta(
      { ...options, align: options.align ?? 'end' },
      { skeleton: <Skeleton className="h-3.5 w-20" /> }
    ),
  };
}

export interface DateColumnOptions<TData> extends BaseColumnOptions<TData> {
  key: string;
  value: (row: TData) => string;
  muted?: boolean;
}

export function dateColumn<TData>(options: DateColumnOptions<TData>): ColumnDef<TData> {
  return {
    id: options.key,
    accessorKey: options.key,
    header: ({ column }) => <DataGridColumnHeader column={column} title={options.title} />,
    cell: ({ row }) => (
      <span
        className={cn(
          'text-sm tabular-nums',
          options.muted ? 'text-muted-foreground' : 'text-foreground'
        )}
      >
        {options.value(row.original)}
      </span>
    ),
    enableSorting: options.sortable,
    meta: meta(options, { skeleton: <Skeleton className="h-3.5 w-24" /> }),
  };
}

export interface StatusColumnOptions<TData> extends BaseColumnOptions<TData> {
  key: string;
  value: (row: TData) => string | null | undefined;
  /** Per-module vocabulary additions. See `statusTone`. */
  tones?: Record<string, StatusTone>;
  fallback?: string;
}

/** A status badge, resolved through the shared tone vocabulary. */
export function statusColumn<TData>(options: StatusColumnOptions<TData>): ColumnDef<TData> {
  return {
    id: options.key,
    accessorKey: options.key,
    header: ({ column }) => <DataGridColumnHeader column={column} title={options.title} />,
    cell: ({ row }) => (
      <StatusBadge
        fallback={options.fallback}
        status={options.value(row.original)}
        tones={options.tones}
      />
    ),
    enableSorting: options.sortable,
    meta: meta(options, { skeleton: <Skeleton className="h-5 w-20 rounded-sm" /> }),
  };
}

export type ActionsColumnOptions<TData> =
  | {
      /** Names the record for the trigger's accessible name. */
      label: (row: TData) => string;
      items: (row: TData) => (RowAction | false | null | undefined)[];
      cell?: never;
    }
  | {
      /**
       * A component rendering `<RowActions>` itself.
       *
       * For rows whose available actions depend on a query — the project lists
       * read their permissions from the project's `capabilities`, which is a
       * hook call and so cannot live in the plain `items` function above. The
       * column still owns width, alignment and the skeleton.
       */
      cell: (row: TData) => ReactNode;
      label?: never;
      items?: never;
    };

/**
 * The `⋯` column.
 *
 * Owns its width, its button size and its skeleton together — the three had
 * drifted into four column widths, two button heights and four skeleton
 * spellings across the eleven column files, so a loading row changed height when
 * the data landed.
 */
export function actionsColumn<TData>(options: ActionsColumnOptions<TData>): ColumnDef<TData> {
  return {
    id: 'actions',
    header: () => null,
    cell: ({ row }) =>
      options.cell ? (
        options.cell(row.original)
      ) : (
        <RowActions items={options.items(row.original)} label={options.label(row.original)} />
      ),
    enableHiding: false,
    enableSorting: false,
    meta: {
      align: 'end',
      cellClassName: COLUMN_WIDTHS.actions,
      headerClassName: COLUMN_WIDTHS.actions,
      skeleton: <Skeleton className="size-7 rounded-md" />,
    },
    size: 64,
  };
}

export interface CustomColumnOptions<TData> extends BaseColumnOptions<TData> {
  key: string;
  cell: (row: TData) => ReactNode;
  skeleton?: ReactNode;
}

/** Anything the kinds above do not cover. Still gets width, align and skeleton. */
export function customColumn<TData>(options: CustomColumnOptions<TData>): ColumnDef<TData> {
  return {
    id: options.key,
    header: ({ column }) => <DataGridColumnHeader column={column} title={options.title} />,
    cell: ({ row }) => options.cell(row.original),
    enableSorting: options.sortable ?? false,
    meta: meta(options, {
      skeleton: options.skeleton ?? <Skeleton className="h-3.5 w-24" />,
    }),
  };
}

/**
 * Column builders.
 *
 * Declared as data, the way filters are. Each kind owns the four things every
 * column file used to restate by hand: alignment (header *and* cell), width,
 * skeleton, and whether it sorts.
 *
 * @example
 * const columns = [
 *   col.link({ key: 'name', title: 'Vendor', to: (v) => v.id, label: (v) => v.name, width: 'xl' }),
 *   col.status({ key: 'status', title: 'Status', value: (v) => v.status }),
 *   col.currency({ key: 'balance', title: 'Balance', value: (v) => formatCurrency(v.balance) }),
 *   col.actions({ label: (v) => v.name, items: (v) => [{ label: 'Edit', to: `${v.id}/edit` }] }),
 * ];
 */
export const col = {
  actions: actionsColumn,
  currency: currencyColumn,
  custom: customColumn,
  date: dateColumn,
  link: linkColumn,
  status: statusColumn,
  text: textColumn,
};
