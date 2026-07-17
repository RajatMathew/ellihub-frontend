import type { ReactNode } from 'react';

import { DataGridSection } from '@/app/components/data-grid-section';
import {
  TableCardHeader,
  TableCardHeaderClearButton,
  TableCardHeaderSearch,
  TableCardHeaderToolbar,
} from '@/app/components/table-card-header';
import { Button } from '@/app/components/ui/button';
import { Card } from '@/app/components/ui/card';
import { formatDate, getInitials } from '@/app/lib/helpers';
import {
  EmployeeActionsCell,
  EmployeeStatusCell,
} from '@/modules/hr/components/employees/list/employee-list-column-cells';
import type { Employee } from '@/modules/hr/schemas/employee.schema';
import type { Table } from '@tanstack/react-table';
import { Building2, CalendarDays, Mail, Phone, Plus, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

interface EmployeesTableCardProps {
  table: Table<Employee>;
  totalCount: number;
  isLoading: boolean;
  isRefreshing?: boolean;
  isError: boolean;
  isRefetching: boolean;
  searchInput: string;
  searchQuery: string;
  onDelete: (employee: { id: string; name: string }) => void;
  onSearchChange: (value: string) => void;
  onClearSearch: () => void;
  onRetry: () => void;
}

export function EmployeesTableCard({
  table,
  totalCount,
  isLoading,
  isRefreshing,
  isError,
  searchInput,
  searchQuery,
  onDelete,
  onSearchChange,
  onClearSearch,
  onRetry,
}: EmployeesTableCardProps) {
  return (
    <Card className="min-w-0 max-w-full overflow-hidden">
      <TableCardHeader
        title={
          <span className="flex items-center text-sm font-bold tracking-normal text-table-card-header-foreground">
            All Employees
          </span>
        }
        actions={
          <TableCardHeaderToolbar>
            <TableCardHeaderSearch
              value={searchInput}
              placeholder="Search employees..."
              onChange={onSearchChange}
              className="min-w-0 sm:w-72"
            />
            <TableCardHeaderClearButton active={Boolean(searchQuery)} onClick={onClearSearch} />
          </TableCardHeaderToolbar>
        }
      />

      <DataGridSection
        table={table}
        totalCount={totalCount}
        isLoading={isLoading || Boolean(isRefreshing)}
        refreshIndicator="none"
        isError={isError}
        errorTitle="Failed to load employees."
        emptyIcon={<Users className="size-10 text-muted-foreground/40" />}
        emptyTitle="No employees found"
        emptyDescription="Add your first employee to start managing the workforce."
        onRetry={onRetry}
        tableLayout={{
          width: 'fixed',
        }}
        mobileBreakpoint="xl"
        mobileItem={(employee) => <EmployeeMobileCard employee={employee} onDelete={onDelete} />}
        emptyAction={<NewEmployeeButton />}
      />
    </Card>
  );
}

function EmployeeMobileCard({
  employee,
  onDelete,
}: {
  employee: Employee;
  onDelete: (employee: { id: string; name: string }) => void;
}) {
  return (
    <div className="min-w-0 max-w-full rounded-md border bg-background p-3 shadow-xs shadow-black/5">
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="flex min-w-0 items-start gap-3">
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
        <EmployeeActionsCell employee={employee} onDelete={onDelete} />
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

function NewEmployeeButton(): ReactNode {
  return (
    <Button variant="outline" size="sm" className="mt-4" asChild>
      <Link to="create">
        <Plus className="size-4" />
        New Employee
      </Link>
    </Button>
  );
}
