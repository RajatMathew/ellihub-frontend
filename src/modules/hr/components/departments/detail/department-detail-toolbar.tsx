import { DetailPageHeader } from '@/app/components/page-header';
import type { DepartmentDetail } from '@/modules/hr/schemas/department.schema';
import { Calendar, Pencil, Trash2, Users } from 'lucide-react';

interface DepartmentDetailToolbarProps {
  department: DepartmentDetail;
  employeeCount: number;
  sidebarOpen: boolean;
  onOpenSidebar: () => void;
  onDelete: () => void;
}

export function DepartmentDetailToolbar({
  department,
  employeeCount,
  sidebarOpen,
  onOpenSidebar,
  onDelete,
}: DepartmentDetailToolbarProps) {
  const isEmpty = employeeCount === 0;

  return (
    <DetailPageHeader
      title={department.name}
      meta={[
        { label: 'Employees', value: employeeCount, icon: Users },
        ...(department.createdAt
          ? [
              {
                label: 'Created',
                value: new Date(department.createdAt).toLocaleDateString(),
                icon: Calendar,
              },
            ]
          : []),
      ]}
      actions={[
        {
          label: 'Edit Department',
          icon: Pencil,
          to: 'edit',
          enabled: { resource: 'department', action: 'update' },
        },
        {
          label: 'Delete Department',
          icon: Trash2,
          placement: 'overflow',
          destructive: true,
          onClick: onDelete,
          disabled: !isEmpty,
          disabledReason: 'Remove employees from this department before deleting it.',
          enabled: { resource: 'department', action: 'delete' },
        },
      ]}
      panel={{ open: sidebarOpen, onOpen: onOpenSidebar, label: 'View Activity' }}
    />
  );
}
