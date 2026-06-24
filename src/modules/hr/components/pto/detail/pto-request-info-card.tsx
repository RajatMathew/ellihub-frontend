import type { ReactNode } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import {
  calculatePTODays,
  formatPTODate,
  getPTOTypeLabel,
} from '@/modules/hr/components/pto/shared';
import type { PTO } from '@/modules/hr/schemas/pto.schema';
import { CalendarDays, Clock3, FileText, MessageSquareText } from 'lucide-react';

interface PTORequestInfoCardProps {
  pto: PTO;
}

export function PTORequestInfoCard({ pto }: PTORequestInfoCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="min-w-0">
          <CardTitle className="text-sm font-semibold">Request Details</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Dates, category, and the reason submitted with this time off request.
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 pt-0">
        <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryTile
            icon={CalendarDays}
            label="Start Date"
            value={formatPTODate(pto.startDate)}
          />
          <SummaryTile icon={CalendarDays} label="End Date" value={formatPTODate(pto.endDate)} />
          <SummaryTile
            icon={Clock3}
            label="Duration"
            value={`${calculatePTODays(pto.startDate, pto.endDate)} days`}
          />
          <SummaryTile icon={FileText} label="Category" value={getPTOTypeLabel(pto)} />
        </div>

        <div className="rounded-lg border border-card-border bg-muted/20 p-4 sm:p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
            <MessageSquareText className="size-4 text-muted-foreground" />
            Reason
          </div>
          <p className="whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground">
            {pto.reason || 'No reason was provided.'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryTile({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CalendarDays;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-card-border bg-background p-4">
      <div className="mb-3 flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Icon className="size-4" />
      </div>
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-1 break-words text-sm font-semibold text-foreground">{value}</div>
    </div>
  );
}
