import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Separator } from '@/app/components/ui/separator';
import type { Employee } from '@/modules/hr/schemas/employee.schema';

interface EmployeeOverviewTabProps {
  employee: Employee;
}

export function EmployeeOverviewTab({ employee }: EmployeeOverviewTabProps) {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Core Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-1">
          <EmployeeInfoRow
            label="Start Date"
            value={employee.startDate ? new Date(employee.startDate).toLocaleDateString() : '-'}
          />
          <Separator />
          <EmployeeInfoRow
            label="Base Department"
            value={employee.department?.name || 'Unassigned'}
          />
          <Separator />
          <EmployeeInfoRow label="Work Address" value={employee.address || 'Office'} alignEnd />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Emergency Contact
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-1">
          <EmployeeInfoRow label="Full Name" value={employee.emergencyContactName || '-'} />
          <Separator />
          <EmployeeInfoRow label="Relationship" value={employee.emergencyContactRelation || '-'} />
          <Separator />
          <EmployeeInfoRow label="Phone Number" value={employee.emergencyContactPhone || '-'} />
        </CardContent>
      </Card>
    </div>
  );
}

function EmployeeInfoRow({
  label,
  value,
  alignEnd,
}: {
  label: string;
  value: string;
  alignEnd?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <span
        className={`min-w-0 break-words text-sm font-medium sm:text-right ${
          alignEnd ? 'sm:max-w-48' : ''
        }`}
      >
        {value}
      </span>
    </div>
  );
}
