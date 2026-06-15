import { useMemo } from 'react';

import { DataGridColumnHeader } from '@/app/components/ui/data-grid-column-header';
import { Skeleton } from '@/app/components/ui/skeleton';
import {
  PTOActionsCell,
  PTODatesCell,
  PTODatesSkeleton,
  PTODaysCell,
  PTOEmployeeCell,
  PTOReferenceCell,
  PTOStatusCell,
  PTOTypeCell,
  PTOUpdatedCell,
} from '@/modules/hr/components/pto/list/pto-list-column-cells';
import type { PTODecisionTarget } from '@/modules/hr/components/pto/shared';
import type { PTO } from '@/modules/hr/schemas/pto.schema';
import type { ColumnDef } from '@tanstack/react-table';

interface UsePTOListColumnsParams {
  isDecisionPending: boolean;
  onDelete: (request: { id: string; name: string }) => void;
  onDecision: (target: PTODecisionTarget) => void;
}

export function usePTOListColumns({
  isDecisionPending,
  onDelete,
  onDecision,
}: UsePTOListColumnsParams) {
  return useMemo<ColumnDef<PTO>[]>(
    () => [
      {
        accessorKey: 'id',
        size: 96,
        header: ({ column }) => <DataGridColumnHeader column={column} title="ID" />,
        cell: ({ row }) => <PTOReferenceCell pto={row.original} />,
        meta: {
          headerClassName: 'w-24',
          skeleton: <Skeleton className="h-4 w-12 rounded" />,
        },
      },
      {
        accessorKey: 'employee.name',
        size: 170,
        header: ({ column }) => <DataGridColumnHeader column={column} title="Employee" />,
        cell: ({ row }) => <PTOEmployeeCell pto={row.original} />,
        meta: {
          headerClassName: 'min-w-40',
          textOverflow: 'truncate',
          tooltipContent: (pto) => pto.employee?.name,
          skeleton: <Skeleton className="h-4 w-32 rounded" />,
        },
      },
      {
        accessorKey: 'type.label',
        size: 130,
        header: ({ column }) => <DataGridColumnHeader column={column} title="Type" />,
        cell: ({ row }) => <PTOTypeCell pto={row.original} />,
        meta: {
          headerClassName: 'w-32',
          textOverflow: 'truncate',
          tooltipContent: (pto) => pto.type?.label,
          skeleton: <Skeleton className="h-5 w-20 rounded" />,
        },
      },
      {
        id: 'dates',
        size: 170,
        header: ({ column }) => <DataGridColumnHeader column={column} title="Dates" />,
        cell: ({ row }) => <PTODatesCell pto={row.original} />,
        meta: {
          headerClassName: 'min-w-40',
          skeleton: <PTODatesSkeleton />,
        },
      },
      {
        id: 'days',
        size: 72,
        header: ({ column }) => <DataGridColumnHeader column={column} title="Days" />,
        cell: ({ row }) => <PTODaysCell pto={row.original} />,
        meta: {
          headerClassName: 'w-20',
          skeleton: <Skeleton className="h-4 w-8 rounded" />,
        },
      },
      {
        accessorKey: 'status',
        size: 110,
        header: ({ column }) => <DataGridColumnHeader column={column} title="Status" />,
        cell: ({ row }) => <PTOStatusCell pto={row.original} />,
        meta: {
          headerClassName: 'w-28',
          skeleton: <Skeleton className="h-5 w-16 rounded" />,
        },
      },
      {
        accessorKey: 'updatedAt',
        size: 140,
        header: ({ column }) => <DataGridColumnHeader column={column} title="Updated On" />,
        cell: ({ row }) => <PTOUpdatedCell pto={row.original} />,
        meta: {
          headerClassName: 'w-36',
          skeleton: <Skeleton className="h-4 w-24 rounded" />,
        },
      },
      {
        id: 'actions',
        size: 116,
        header: () => null,
        cell: ({ row }) => (
          <PTOActionsCell
            pto={row.original}
            isDecisionPending={isDecisionPending}
            onDelete={onDelete}
            onDecision={onDecision}
          />
        ),
        meta: {
          headerClassName: 'w-28 text-right',
          skeleton: (
            <div className="flex justify-end pr-2">
              <Skeleton className="size-8 rounded-md" />
            </div>
          ),
        },
      },
    ],
    [isDecisionPending, onDelete, onDecision]
  );
}
