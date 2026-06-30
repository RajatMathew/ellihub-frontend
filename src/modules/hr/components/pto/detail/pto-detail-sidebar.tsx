import type { ReactNode } from 'react';

import { DetailSidebar } from '@/app/components/detail-sidebar';
import { Card, CardContent } from '@/app/components/ui/card';
import { Separator } from '@/app/components/ui/separator';
import {
  formatPTODateTime,
  formatPTOReference,
  getPTOTypeLabel,
  PTOStatusBadge,
} from '@/modules/hr/components/pto/shared';
import type { PTO } from '@/modules/hr/schemas/pto.schema';

import { PTOEmployeeCard } from './pto-employee-card';

interface PTODetailSidebarProps {
  pto: PTO;
  open: boolean;
  onClose: () => void;
}

export function PTODetailSidebar({ pto, open, onClose }: PTODetailSidebarProps) {
  return (
    <DetailSidebar open={open} onClose={onClose}>
      <div className="space-y-6 pt-2">
        <PTOEmployeeCard pto={pto} />

        <div>
          <div className="mb-3 px-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Request Info
          </div>
          <Card>
            <CardContent className="space-y-4 p-4">
              <SidebarField label="Reference" value={formatPTOReference(pto.id, 6)} mono />
              <Separator />
              <SidebarField label="Type" value={getPTOTypeLabel(pto)} />
              <SidebarField label="Status" value={<PTOStatusBadge status={pto.status} />} />
              <SidebarField label="Submitted" value={formatPTODateTime(pto.createdAt)} />
              <SidebarField label="Last Updated" value={formatPTODateTime(pto.updatedAt)} />
              {pto.reviewedAt && (
                <SidebarField label="Reviewed" value={formatPTODateTime(pto.reviewedAt)} />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DetailSidebar>
  );
}

function SidebarField({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
      <div
        className={
          mono
            ? 'break-words font-mono text-xs text-muted-foreground sm:text-right'
            : 'break-words text-sm font-semibold text-foreground sm:text-right'
        }
      >
        {value}
      </div>
    </div>
  );
}
