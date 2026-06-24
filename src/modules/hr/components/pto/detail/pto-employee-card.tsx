import type { ReactNode } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { getPTOEmployeeName, getPTORoleLabel } from '@/modules/hr/components/pto/shared';
import type { PTO } from '@/modules/hr/schemas/pto.schema';
import { BriefcaseBusiness, Building2, Mail, Phone } from 'lucide-react';

interface PTOEmployeeCardProps {
  pto: PTO;
}

export function PTOEmployeeCard({ pto }: PTOEmployeeCardProps) {
  const employeeName = getPTOEmployeeName(pto);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold">Employee</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        <div className="flex min-w-0 items-center gap-3 rounded-lg border border-card-border bg-muted/20 p-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
            {getInitials(employeeName)}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-foreground">{employeeName}</div>
            <div className="truncate text-xs text-muted-foreground">{getPTORoleLabel(pto)}</div>
          </div>
        </div>

        <div className="space-y-3">
          <EmployeeField icon={Building2} label="Department">
            {pto.employee?.department?.name ?? 'Unassigned'}
          </EmployeeField>
          <EmployeeField icon={BriefcaseBusiness} label="Role">
            {getPTORoleLabel(pto)}
          </EmployeeField>
          <EmployeeField icon={Mail} label="Email">
            {pto.employee?.email ?? '-'}
          </EmployeeField>
          <EmployeeField icon={Phone} label="Phone">
            {pto.employee?.phoneNumber ?? '-'}
          </EmployeeField>
        </div>
      </CardContent>
    </Card>
  );
}

function EmployeeField({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Mail;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <Icon className="size-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-medium text-muted-foreground">{label}</div>
        <div className="break-words text-sm font-medium text-foreground">{children}</div>
      </div>
    </div>
  );
}

function getInitials(name: string) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  return initials || 'TO';
}
