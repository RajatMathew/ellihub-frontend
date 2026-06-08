import { useMemo } from 'react';

import { DataGridColumnHeader } from '@/app/components/ui/data-grid-column-header';
import { Skeleton } from '@/app/components/ui/skeleton';
import {
  ContactActionsCell,
  ContactEmailCell,
  ContactLinkedCompanyCell,
  ContactNameCell,
  ContactPhoneCell,
  ContactRoleCell,
} from '@/modules/directory/components/contacts/contact-list-column-cells';
import type { Contact } from '@/modules/directory/schemas/contact.schema';
import { type ColumnDef } from '@tanstack/react-table';

interface UseContactListColumnsOptions {
  vendorNames: Map<string, string>;
  onDelete: (contact: Contact) => void;
  canUpdate: boolean;
  canDelete: boolean;
}

export function useContactListColumns({
  vendorNames,
  onDelete,
  canUpdate,
  canDelete,
}: UseContactListColumnsOptions) {
  return useMemo<ColumnDef<Contact>[]>(
    () => [
      {
        accessorKey: 'fullName',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Contact Name" />,
        cell: ({ row }) => <ContactNameCell contact={row.original} />,
        meta: {
          headerClassName: 'min-w-64',
          textOverflow: 'truncate',
          skeleton: (
            <div className="flex items-center gap-3">
              <Skeleton className="size-9 rounded-full" />
              <div className="flex flex-col gap-1.5">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ),
        },
      },
      {
        id: 'linkedEntity',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Linked Company" />,
        cell: ({ row }) => (
          <ContactLinkedCompanyCell contact={row.original} vendorNames={vendorNames} />
        ),
        meta: {
          headerClassName: 'min-w-48',
          skeleton: <Skeleton className="h-3.5 w-24" />,
        },
        enableSorting: false,
      },
      {
        id: 'email',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Email" />,
        cell: ({ row }) => <ContactEmailCell contact={row.original} />,
        meta: {
          headerClassName: 'min-w-56',
          textOverflow: 'truncate',
          tooltipContent: (contact) => contact.email?.[0]?.email,
          skeleton: (
            <div className="flex items-center gap-2">
              <Skeleton className="size-3.5 rounded-sm" />
              <Skeleton className="h-3.5 w-36" />
            </div>
          ),
        },
        enableSorting: false,
      },
      {
        id: 'phone',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Phone" />,
        cell: ({ row }) => <ContactPhoneCell contact={row.original} />,
        meta: {
          headerClassName: 'min-w-44',
          skeleton: (
            <div className="flex items-center gap-2">
              <Skeleton className="size-3.5 rounded-sm" />
              <Skeleton className="h-3.5 w-24" />
            </div>
          ),
        },
        enableSorting: false,
      },
      {
        id: 'role',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Roles" />,
        cell: ({ row }) => <ContactRoleCell contact={row.original} />,
        meta: {
          headerClassName: 'min-w-40',
          skeleton: <Skeleton className="h-5 w-20 rounded-sm" />,
        },
        enableSorting: false,
      },
      {
        id: 'actions',
        header: () => null,
        cell: ({ row }) => (
          <ContactActionsCell
            contact={row.original}
            canUpdate={canUpdate}
            canDelete={canDelete}
            onDelete={onDelete}
          />
        ),
        meta: {
          headerClassName: 'w-16',
          skeleton: <Skeleton className="size-7 rounded-md" />,
        },
        enableSorting: false,
      },
    ],
    [canDelete, canUpdate, onDelete, vendorNames]
  );
}
