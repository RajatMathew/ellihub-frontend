import { DetailPageHeader } from '@/app/components/page-header';
import {
  formatPTODate,
  formatPTOReference,
  getPTOEmployeeName,
  getPTOTypeLabel,
  PTOStatusBadge,
} from '@/modules/hr/components/pto/shared';
import type { PTO } from '@/modules/hr/schemas/pto.schema';
import { CalendarDays, Pencil, Tag, Trash2 } from 'lucide-react';

interface PTODetailToolbarProps {
  pto: PTO;
  sidebarOpen: boolean;
  onDelete: () => void;
  onOpenSidebar: () => void;
}

export function PTODetailToolbar({
  pto,
  sidebarOpen,
  onDelete,
  onOpenSidebar,
}: PTODetailToolbarProps) {
  const isPending = pto.status === 'PENDING';

  return (
    <DetailPageHeader
      backLabel="Time Off Requests"
      title={getPTOEmployeeName(pto)}
      status={<PTOStatusBadge status={pto.status} />}
      meta={[
        {
          label: 'Dates',
          value: `${formatPTODate(pto.startDate)} - ${formatPTODate(pto.endDate)}`,
          icon: CalendarDays,
        },
        { label: 'Type', value: getPTOTypeLabel(pto), icon: Tag },
        { label: 'Reference', value: formatPTOReference(pto.id, 6) },
      ]}
      actions={[
        {
          label: 'Modify Request',
          icon: Pencil,
          to: 'edit',
          // Only a pending request is still editable; `leave` has no `update`
          // action, so `create` is the permission the rest of the module uses.
          enabled: [isPending, { resource: 'leave', action: 'create' }],
        },
        {
          label: 'Delete Request',
          icon: Trash2,
          placement: 'overflow',
          destructive: true,
          onClick: onDelete,
          enabled: { resource: 'leave', action: 'create' },
        },
      ]}
      panel={{ open: sidebarOpen, onOpen: onOpenSidebar, label: 'Details' }}
    />
  );
}
