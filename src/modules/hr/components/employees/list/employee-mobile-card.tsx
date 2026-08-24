import type { ReactNode } from 'react';

import { formatDate, getInitials } from '@/app/lib/helpers';
import {
  EmployeeActionsCell,
  EmployeeStatusCell,
} from '@/modules/hr/components/employees/list/employee-list-column-cells';
import type { Employee } from '@/modules/hr/schemas/employee.schema';
import { Building2, CalendarDays, Mail, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';

export function EmployeeMobileCard({
  employee,
  onDelete,
  canDelete,
  selectionCheckbox,
}: {
  employee: Employee;
  onDelete: (employee: { id: string; name: string }) => void;
  canDelete: boolean;
  /** The row's checkbox, or null when the list has no selection. */
  selectionCheckbox?: ReactNode;
}) {
  return (
    <div className="min-w-0 max-w-full rounded-md border bg-background p-3 shadow-xs shadow-black/5">
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="flex min-w-0 items-start gap-3">
          {selectionCheckbox && (
            <div className="relative flex shrink-0 items-center pt-1">{selectionCheckbox}</div>
          )}
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-xs font-bold text-primary ring-2 ring-background">
            {getInitials(employee.name, 2)}
          </div>
          <div className="min-w-0">
            <Link
              to={employee.id}
              className="block max-w-full truncate text-sm font-semibold text-foreground hover:text-primary"
              title={employee.name}
            >
              {employee.name}
            </Link>
            <div className="mt-1">
              <EmployeeStatusCell employee={employee} />
            </div>
          </div>
        </div>
        <EmployeeActionsCell canDelete={canDelete} employee={employee} onDelete={onDelete} />
      </div>

      <div className="mt-3 grid min-w-0 grid-cols-1 gap-2.5 text-xs sm:grid-cols-2">
        <EmployeeMobileMetric
          icon={<Building2 className="size-3.5" />}
          label="Department"
          value={employee.department?.name || 'Unassigned'}
        />
        <EmployeeMobileMetric
          icon={<Mail className="size-3.5" />}
          label="Email"
          value={employee.email || '-'}
          href={employee.email ? `mailto:${employee.email}` : undefined}
        />
        <EmployeeMobileMetric
          icon={<Phone className="size-3.5" />}
          label="Phone"
          value={employee.phoneNumber || '-'}
          href={employee.phoneNumber ? `tel:${employee.phoneNumber}` : undefined}
        />
        <EmployeeMobileMetric
          icon={<CalendarDays className="size-3.5" />}
          label="Start"
          value={employee.startDate ? formatDate(employee.startDate) : '-'}
        />
      </div>
    </div>
  );
}

function EmployeeMobileMetric({
  icon,
  label,
  value,
  href,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  href?: string;
}) {
  const content = (
    <span className="mt-1 block max-w-full truncate font-medium text-foreground" title={value}>
      {value}
    </span>
  );

  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        {label}
      </p>
      {href ? (
        <a href={href} className="block min-w-0 hover:text-primary">
          {content}
        </a>
      ) : (
        content
      )}
    </div>
  );
}
