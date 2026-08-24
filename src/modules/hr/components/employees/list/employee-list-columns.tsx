import { useMemo } from 'react';

import { col } from '@/app/components/data-table';
import { DataGridColumnHeader } from '@/app/components/ui/data-grid-column-header';
import { Skeleton } from '@/app/components/ui/skeleton';
import {
  EmployeeActionsCell,
  EmployeeDepartmentCell,
  EmployeeEmailCell,
  EmployeeNameCell,
  EmployeeNameSkeleton,
  EmployeePhoneCell,
  EmployeeStartDateCell,
  EmployeeStatusCell,
} from '@/modules/hr/components/employees/list/employee-list-column-cells';
import type { Employee } from '@/modules/hr/schemas/employee.schema';
import type { ColumnDef } from '@tanstack/react-table';

export function useEmployeeListColumns(
  onDelete: (employee: { id: string; name: string }) => void,
  canDelete: boolean
) {
  return useMemo<ColumnDef<Employee>[]>(
    () => [
      {
        accessorKey: 'name',
        size: 220,
        header: ({ column }) => <DataGridColumnHeader column={column} title="Employee Name" />,
        cell: ({ row }) => <EmployeeNameCell employee={row.original} />,
        meta: {
          headerClassName: 'min-w-52',
          textOverflow: 'truncate',
          skeleton: <EmployeeNameSkeleton />,
        },
      },
      {
        accessorKey: 'department.name',
        size: 180,
        header: ({ column }) => <DataGridColumnHeader column={column} title="Department" />,
        cell: ({ row }) => <EmployeeDepartmentCell employee={row.original} />,
        meta: {
          headerClassName: 'min-w-44',
          textOverflow: 'truncate',
          tooltipContent: (employee) => employee.department?.name,
          skeleton: <Skeleton className="h-5 w-24 rounded" />,
        },
      },
      {
        accessorKey: 'email',
        size: 280,
        header: ({ column }) => <DataGridColumnHeader column={column} title="Email" />,
        cell: ({ row }) => <EmployeeEmailCell employee={row.original} />,
        meta: {
          headerClassName: 'min-w-64',
          textOverflow: 'truncate',
          skeleton: <Skeleton className="h-4 w-56" />,
        },
      },
      {
        accessorKey: 'phoneNumber',
        size: 160,
        header: ({ column }) => <DataGridColumnHeader column={column} title="Phone" />,
        cell: ({ row }) => <EmployeePhoneCell employee={row.original} />,
        meta: {
          headerClassName: 'min-w-40',
          skeleton: <Skeleton className="h-4 w-28" />,
        },
      },
      {
        accessorKey: 'status',
        size: 120,
        header: ({ column }) => <DataGridColumnHeader column={column} title="Status" />,
        cell: ({ row }) => <EmployeeStatusCell employee={row.original} />,
        meta: {
          headerClassName: 'w-28',
          skeleton: <Skeleton className="h-5 w-20 rounded" />,
        },
      },
      {
        accessorKey: 'startDate',
        size: 150,
        header: ({ column }) => (
          <DataGridColumnHeader column={column} className="justify-end" title="Start Date" />
        ),
        cell: ({ row }) => <EmployeeStartDateCell employee={row.original} />,
        meta: {
          headerClassName: 'w-36',
          skeleton: (
            <div className="flex justify-end pr-2">
              <Skeleton className="h-4 w-24" />
            </div>
          ),
        },
      },
      col.actions({
        cell: (employee) => (
          <EmployeeActionsCell canDelete={canDelete} employee={employee} onDelete={onDelete} />
        ),
      }),
    ],
    [canDelete, onDelete]
  );
}
