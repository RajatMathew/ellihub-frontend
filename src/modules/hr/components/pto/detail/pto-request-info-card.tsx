import type { ReactNode } from 'react';

import { Badge } from '@/app/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Separator } from '@/app/components/ui/separator';
import {
  calculatePTODays,
  formatPTODate,
  getPTOTypeLabel,
} from '@/modules/hr/components/pto/shared';
import type { PTO } from '@/modules/hr/schemas/pto.schema';

interface PTORequestInfoCardProps {
  pto: PTO;
}

export function PTORequestInfoCard({ pto }: PTORequestInfoCardProps) {
  return (
    <Card>
      <CardHeader className="pb-0">
        <CardTitle className="text-xs font-semibold uppercase tracking-widest">
          Request Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-8 p-4 pt-4 sm:p-6 sm:pt-4">
        <div className="grid min-w-0 grid-cols-1 gap-6 sm:grid-cols-2 2xl:grid-cols-4">
          <InfoField label="Leave Type">
            <Badge
              variant="outline"
              className="border-primary/20 bg-primary/5 font-bold uppercase text-primary"
            >
              {getPTOTypeLabel(pto)}
            </Badge>
          </InfoField>
          <InfoField label="Total Duration">
            {calculatePTODays(pto.startDate, pto.endDate)} Days
          </InfoField>
          <InfoField label="Start Date">{formatPTODate(pto.startDate)}</InfoField>
          <InfoField label="End Date">{formatPTODate(pto.endDate)}</InfoField>
        </div>

        <Separator className="opacity-50" />

        <div className="min-w-0 space-y-3">
          <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Reason / Justification
          </span>
          <div className="break-words rounded-lg border border-border bg-muted/20 p-4 text-sm italic leading-relaxed text-foreground sm:p-5">
            {pto.reason || 'No justification provided.'}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function InfoField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 space-y-1.5">
      <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <div className="break-words text-sm font-bold uppercase tracking-tight text-foreground">
        {children}
      </div>
    </div>
  );
}
