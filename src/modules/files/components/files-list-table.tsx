import { Fragment, type ReactNode } from 'react';

import { CardTable } from '@/app/components/ui/card';
import { useDataGrid } from '@/app/components/ui/data-grid';
import {
  DataGridTable,
  DataGridTableBase,
  DataGridTableBody,
  DataGridTableBodyRowCell,
  DataGridTableEmpty,
  DataGridTableHead,
  DataGridTableHeadRow,
  DataGridTableHeadRowCell,
} from '@/app/components/ui/data-grid-table';
import { Skeleton } from '@/app/components/ui/skeleton';
import { cn } from '@/app/lib/utils';
import { FilesEmptyState } from '@/modules/files/components/files-empty-state';
import type { SectionedFiles } from '@/modules/files/hooks/use-files-display-data';
import { getFileDisplayNameWithExtension } from '@/modules/files/lib/file-display-name';
import type { FileItem } from '@/modules/files/schemas/file.schema';
// Files is the one list that renders its own body: rows are grouped into
// sections and animated, so it composes the grid primitives directly rather
// than going through DataTable. See use-files-list-params for the rationale.
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import { flexRender, type Cell, type Row, type Table } from '@tanstack/react-table';
import { motion } from 'motion/react';

import { FilesSectionHeader } from './files-section-header';

const FILE_REORDER_TRANSITION = { type: 'spring' as const, stiffness: 420, damping: 34, mass: 0.8 };

interface FilesListTableProps {
  table: Table<FileItem>;
  sectionedData: SectionedFiles;
  isLoading: boolean;
}

export function FilesListTable({ table, sectionedData, isLoading }: FilesListTableProps) {
  const { props } = useDataGrid();
  const onRowClick = props.onRowClick as ((item: FileItem) => void) | undefined;
  // Read off the table, not the `columns` prop: selection prepends a checkbox
  // column the caller's array knows nothing about, and a section header that
  // spans one column too few leaves a gap in the row.
  const renderedColumnCount = table.getVisibleFlatColumns().length;

  if (isLoading) {
    return (
      <>
        <FilesMobileLoading />
        <CardTable className="hidden min-w-0 max-w-full overflow-x-auto overscroll-x-contain md:grid">
          <DataGridTable />
        </CardTable>
      </>
    );
  }

  return (
    <>
      <FilesMobileList table={table} sectionedData={sectionedData} onRowClick={onRowClick} />
      <CardTable className="hidden min-w-0 max-w-full overflow-x-auto overscroll-x-contain md:grid">
        <DataGridTableBase>
          <DataGridTableHead>
            {table.getHeaderGroups().map((headerGroup) => (
              <DataGridTableHeadRow headerGroup={headerGroup} key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <DataGridTableHeadRowCell header={header} key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </DataGridTableHeadRowCell>
                ))}
              </DataGridTableHeadRow>
            ))}
          </DataGridTableHead>
          <DataGridTableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row, index) => (
                <Fragment key={row.id}>
                  {index === 0 && sectionedData.protectedItems.length > 0 && (
                    <tr className="bg-muted/50">
                      <td colSpan={renderedColumnCount} className="px-4 py-2.5">
                        <FilesSectionHeader
                          type="protected"
                          count={sectionedData.protectedItems.length}
                        />
                      </td>
                    </tr>
                  )}
                  {index === sectionedData.protectedItems.length &&
                    sectionedData.sharedItems.length > 0 && (
                      <tr className="bg-muted/50">
                        <td colSpan={renderedColumnCount} className="px-4 py-2.5">
                          <FilesSectionHeader
                            type="shared"
                            count={sectionedData.sharedItems.length}
                          />
                        </td>
                      </tr>
                    )}
                  <FilesTableMotionRow row={row}>
                    {row.getVisibleCells().map((cell) => (
                      <DataGridTableBodyRowCell cell={cell} key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </DataGridTableBodyRowCell>
                    ))}
                  </FilesTableMotionRow>
                </Fragment>
              ))
            ) : (
              <DataGridTableEmpty />
            )}
          </DataGridTableBody>
        </DataGridTableBase>
      </CardTable>
    </>
  );
}

function FilesTableMotionRow({ children, row }: { children: ReactNode; row: Row<FileItem> }) {
  const { props, table } = useDataGrid();

  return (
    <motion.tr
      layout="position"
      transition={FILE_REORDER_TRANSITION}
      data-state={table.options.enableRowSelection && row.getIsSelected() ? 'selected' : undefined}
      onClick={() => props.onRowClick && props.onRowClick(row.original)}
      className={cn(
        'hover:bg-muted/40 data-[state=selected]:bg-muted/50',
        props.onRowClick && 'cursor-pointer',
        !props.tableLayout?.stripped &&
          props.tableLayout?.rowBorder &&
          'border-b border-border [&:not(:last-child)>td]:border-b',
        props.tableLayout?.cellBorder && '*:last:border-e-0',
        props.tableLayout?.stripped && 'odd:bg-muted/90 hover:bg-transparent odd:hover:bg-muted',
        table.options.enableRowSelection && '*:first:relative',
        props.tableClassNames?.bodyRow
      )}
    >
      {children}
    </motion.tr>
  );
}

function FilesMobileLoading() {
  return (
    <div className="grid min-w-0 gap-2.5 p-3 md:hidden">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={`files-mobile-loader-${index}`} className="rounded-md border bg-background p-3">
          <div className="flex min-w-0 items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-40 max-w-full" />
              <Skeleton className="h-3 w-56 max-w-full" />
            </div>
            <Skeleton className="size-7 rounded-md" />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }, (_, metricIndex) => (
              <div key={`files-mobile-loader-metric-${metricIndex}`} className="space-y-2">
                <Skeleton className="h-3 w-14" />
                <Skeleton className="h-3.5 w-20 max-w-full" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function FilesMobileList({
  table,
  sectionedData,
  onRowClick,
}: {
  table: Table<FileItem>;
  sectionedData: SectionedFiles;
  onRowClick?: (item: FileItem) => void;
}) {
  const rows = table.getRowModel().rows;

  if (!rows.length) {
    return (
      <div className="md:hidden">
        <FilesEmptyState />
      </div>
    );
  }

  return (
    <div className="grid min-w-0 gap-2.5 p-3 md:hidden">
      {rows.map((row, index) => (
        <Fragment key={row.id}>
          {index === 0 && sectionedData.protectedItems.length > 0 && (
            <div className="rounded-md border bg-muted/50 px-3 py-2">
              <FilesSectionHeader type="protected" count={sectionedData.protectedItems.length} />
            </div>
          )}
          {index === sectionedData.protectedItems.length &&
            sectionedData.sharedItems.length > 0 && (
              <div className="rounded-md border bg-muted/50 px-3 py-2">
                <FilesSectionHeader type="shared" count={sectionedData.sharedItems.length} />
              </div>
            )}
          <FilesMobileRow row={row} onRowClick={onRowClick} />
        </Fragment>
      ))}
    </div>
  );
}

function FilesMobileRow({
  row,
  onRowClick,
}: {
  row: Row<FileItem>;
  onRowClick?: (item: FileItem) => void;
}) {
  const actionsCell = getCell(row, 'actions');
  const fileName = getFileDisplayNameWithExtension(row.original);
  const summary = <FilesMobileRowSummary row={row} />;
  const interactiveClassName =
    'block w-full min-w-0 rounded-sm bg-transparent p-0 text-left outline-none transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

  return (
    <motion.div
      layout="position"
      transition={FILE_REORDER_TRANSITION}
      className="min-w-0 max-w-full rounded-md border bg-background p-3 shadow-xs shadow-black/5"
    >
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        {onRowClick ? (
          <button
            type="button"
            className={interactiveClassName}
            onClick={() => onRowClick(row.original)}
            aria-label={`Open ${fileName}`}
          >
            {renderCell(row, 'name')}
          </button>
        ) : (
          <div className="min-w-0">{renderCell(row, 'name')}</div>
        )}
        {actionsCell && <div>{renderCellValue(actionsCell)}</div>}
      </div>

      {onRowClick ? (
        <button
          type="button"
          className={cn('mt-3', interactiveClassName)}
          onClick={() => onRowClick(row.original)}
          aria-label={`Open ${fileName}`}
        >
          {summary}
        </button>
      ) : (
        <div className="mt-3">{summary}</div>
      )}
    </motion.div>
  );
}

function FilesMobileRowSummary({ row }: { row: Row<FileItem> }) {
  return (
    <div className="grid min-w-0 grid-cols-2 gap-3 text-xs">
      <FilesMobileMetric label="Size">{renderCell(row, 'size')}</FilesMobileMetric>
      <FilesMobileMetric label="Uploaded By">{renderCell(row, 'createdBy')}</FilesMobileMetric>
      <FilesMobileMetric label="Updated">{renderCell(row, 'updatedAt')}</FilesMobileMetric>
      <FilesMobileMetric label="Type">
        {row.original.type === 'FOLDER' ? 'Folder' : 'File'}
      </FilesMobileMetric>
    </div>
  );
}
function FilesMobileMetric({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-muted-foreground">{label}</p>
      <div className="mt-1 min-w-0 truncate font-medium text-foreground">{children}</div>
    </div>
  );
}

function getCell(row: Row<FileItem>, columnId: string) {
  return row.getVisibleCells().find((cell) => cell.column.id === columnId);
}

function renderCell(row: Row<FileItem>, columnId: string) {
  const cell = getCell(row, columnId);
  return cell ? renderCellValue(cell) : null;
}

function renderCellValue(cell: Cell<FileItem, unknown>) {
  return flexRender(cell.column.columnDef.cell, cell.getContext());
}
