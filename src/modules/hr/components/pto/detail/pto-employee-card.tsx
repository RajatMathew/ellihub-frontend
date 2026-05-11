import type { ReactNode } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { getPTORoleLabel } from '@/modules/hr/components/pto/shared';
import type { PTO } from '@/modules/hr/schemas/pto.schema';

interface PTOEmployeeCardProps {
  pto: PTO;
}

export function PTOEmployeeCard({ pto }: PTOEmployeeCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xs font-semibold uppercase tracking-widest">
          Employee Details
        </CardTitle>
      </CardHeader>
      <CardContent className="min-w-0 space-y-4 p-4">
        <SidebarField label="Staff Member">{pto.employee?.name ?? '-'}</SidebarField>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1 2xl:grid-cols-2">
          <SidebarField label="Department">{pto.employee?.department?.name ?? '-'}</SidebarField>
          <SidebarField label="Role">{getPTORoleLabel(pto)}</SidebarField>
        </div>
        <SidebarField label="Email Address">{pto.employee?.email ?? '-'}</SidebarField>
        <SidebarField label="Phone Number">{pto.employee?.phoneNumber ?? '-'}</SidebarField>
      </CardContent>
    </Card>
  );
}

function SidebarField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 border-b border-border pb-3 last:border-b-0 last:pb-0">
      <span className="mb-0.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <div className="break-words text-sm font-bold uppercase text-foreground">{children}</div>
    </div>
  );
}
