import { useMemo } from 'react';

import { col } from '@/app/components/data-table';
import { DataGridColumnHeader } from '@/app/components/ui/data-grid-column-header';
import { Skeleton } from '@/app/components/ui/skeleton';
import {
  DepartmentCreatedCell,
  DepartmentEmployeeCountCell,
  DepartmentNameCell,
  DepartmentNameSkeleton,
} from '@/modules/hr/components/departments/list/department-list-column-cells';
import { canDeleteDepartment } from '@/modules/hr/components/departments/list/department-list-utils';
import type { Department } from '@/modules/hr/schemas/department.schema';
import type { ColumnDef } from '@tanstack/react-table';

export function useDepartmentListColumns(
  onDelete: (department: { id: string; name: string; employeeCount?: number }) => void,
  canDelete: boolean
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
      col.actions({
        label: (department) => department.name,
        items: (department) => [
          { label: 'View Details', to: department.id },
          { label: 'Edit', to: `${department.id}/edit` },
          canDelete && {
            destructive: true,
            // Same predicate the checkbox column uses, so the menu cannot offer
            // what a bulk delete would refuse.
            disabled: !canDeleteDepartment(department),
            label: 'Delete',
            onSelect: () =>
              onDelete({
                employeeCount: department.employeeCount ?? 0,
                id: department.id,
                name: department.name,
              }),
          },
        ],
      }),
    ],
    [canDelete, onDelete]
  );
}
