import { DetailPageHeader } from '@/app/components/page-header';
import type { Employee } from '@/modules/hr/schemas/employee.schema';
import { Calendar, Pencil, ShieldAlert, Trash2 } from 'lucide-react';

interface EmployeeDetailToolbarProps {
  employee: Employee;
  sidebarOpen: boolean;
  onDelete: () => void;
  onOpenSidebar: () => void;
}

export function EmployeeDetailToolbar({
  employee,
  sidebarOpen,
  onDelete,
  onOpenSidebar,
}: EmployeeDetailToolbarProps) {
  return (
    <DetailPageHeader
      title={employee.name}
      meta={[
        {
          label: 'Role',
          value: employee.role?.label || employee.role?.name || 'No Professional Role',
          icon: ShieldAlert,
        },
        ...(employee.startDate
          ? [
              {
                label: 'Joined',
                value: new Date(employee.startDate).toLocaleDateString(),
                icon: Calendar,
              },
            ]
          : []),
      ]}
      actions={[
        {
          label: 'Edit Profile',
          icon: Pencil,
          to: 'edit',
          enabled: { resource: 'employee', action: 'update' },
        },
        {
          label: 'Deactivate Account',
          icon: Trash2,
          placement: 'overflow',
          destructive: true,
          onClick: onDelete,
          enabled: { resource: 'employee', action: 'delete' },
        },
      ]}
      panel={{ open: sidebarOpen, onOpen: onOpenSidebar, label: 'Contact Info' }}
    />
  );
}
