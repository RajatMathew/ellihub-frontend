import { useMemo } from 'react';

import { DataGridColumnHeader } from '@/app/components/ui/data-grid-column-header';
import { Skeleton } from '@/app/components/ui/skeleton';
import {
  DepartmentActionsCell,
  DepartmentCreatedCell,
  DepartmentEmployeeCountCell,
  DepartmentNameCell,
  DepartmentNameSkeleton,
} from '@/modules/hr/components/departments/list/department-list-column-cells';
import type { Department } from '@/modules/hr/schemas/department.schema';
import type { ColumnDef } from '@tanstack/react-table';

export function useDepartmentListColumns(
  onDelete: (department: { id: string; name: string; employeeCount?: number }) => void
) {
  return useMemo<ColumnDef<Department>[]>(
    () => [
      {
        accessorKey: 'name',
        size: 280,
        header: ({ column }) => <DataGridColumnHeader column={column} title="Department Name" />,
        cell: ({ row }) => <DepartmentNameCell department={row.original} />,
        meta: {
          headerClassName: 'min-w-64',
          textOverflow: 'truncate',
          skeleton: <DepartmentNameSkeleton />,
        },
      },
      {
        accessorKey: 'employeeCount',
        size: 150,
        header: ({ column }) => <DataGridColumnHeader column={column} title="Employees" />,
        cell: ({ row }) => <DepartmentEmployeeCountCell department={row.original} />,
        meta: {
          headerClassName: 'w-36',
          skeleton: <Skeleton className="h-4 w-12" />,
        },
      },
      {
        accessorKey: 'createdAt',
        size: 180,
        header: ({ column }) => <DataGridColumnHeader column={column} title="Created" />,
        cell: ({ row }) => <DepartmentCreatedCell department={row.original} />,
        meta: {
          headerClassName: 'w-44',
          skeleton: <Skeleton className="h-4 w-24" />,
        },
      },
      {
        id: 'actions',
        size: 64,
        header: () => null,
        cell: ({ row }) => <DepartmentActionsCell department={row.original} onDelete={onDelete} />,
        meta: {
          headerClassName: 'w-16 text-end pr-4',
          skeleton: (
            <div className="flex justify-end pr-2">
              <Skeleton className="size-8 rounded-md" />
            </div>
          ),
        },
        enableSorting: false,
      },
    ],
    [onDelete]
  );
}
