import { Fragment } from 'react';

import { CardTable } from '@/app/components/ui/card';
import {
  DataGridTable,
  DataGridTableBase,
  DataGridTableBody,
  DataGridTableBodyRow,
  DataGridTableBodyRowCell,
  DataGridTableEmpty,
  DataGridTableHead,
  DataGridTableHeadRow,
  DataGridTableHeadRowCell,
} from '@/app/components/ui/data-grid-table';
import type { SectionedFiles } from '@/modules/files/hooks/use-files-display-data';
import type { FileItem } from '@/modules/files/schemas/file.schema';
import { flexRender, type ColumnDef, type Table } from '@tanstack/react-table';

import { FilesSectionHeader } from './files-section-header';

interface FilesListTableProps {
  table: Table<FileItem>;
  columns: ColumnDef<FileItem>[];
  sectionedData: SectionedFiles;
  isLoading: boolean;
}

export function FilesListTable({ table, columns, sectionedData, isLoading }: FilesListTableProps) {
  if (isLoading) {
    return (
      <CardTable className="overflow-x-auto">
        <DataGridTable />
      </CardTable>
    );
  }

  return (
    <CardTable className="overflow-x-auto">
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
                    <td colSpan={columns.length} className="px-4 py-2.5">
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
                      <td colSpan={columns.length} className="px-4 py-2.5">
                        <FilesSectionHeader
                          type="shared"
                          count={sectionedData.sharedItems.length}
                        />
                      </td>
                    </tr>
                  )}
                <DataGridTableBodyRow row={row}>
                  {row.getVisibleCells().map((cell) => (
                    <DataGridTableBodyRowCell cell={cell} key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </DataGridTableBodyRowCell>
                  ))}
                </DataGridTableBodyRow>
              </Fragment>
            ))
          ) : (
            <DataGridTableEmpty />
          )}
        </DataGridTableBody>
      </DataGridTableBase>
    </CardTable>
  );
}
