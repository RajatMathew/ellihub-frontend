import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { formatPTODateTime } from '@/modules/hr/components/pto/shared';
import type { PTO } from '@/modules/hr/schemas/pto.schema';
import { CheckCircle2, CircleDot, Clock3, XCircle } from 'lucide-react';

interface PTOHistoryCardProps {
  pto: PTO;
}

export function PTOHistoryCard({ pto }: PTOHistoryCardProps) {
  const isPending = pto.status === 'PENDING';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold">Activity</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="relative space-y-5 before:absolute before:bottom-3 before:left-3 before:top-3 before:w-px before:bg-border">
          <HistoryItem
            tone="primary"
            icon={CircleDot}
            title="Submitted"
            date={formatPTODateTime(pto.createdAt)}
          />
          <HistoryItem
            tone={isPending ? 'muted' : pto.status === 'APPROVED' ? 'success' : 'destructive'}
            icon={isPending ? Clock3 : pto.status === 'APPROVED' ? CheckCircle2 : XCircle}
            title={isPending ? 'Waiting for review' : titleCase(pto.status)}
            date={!isPending ? formatPTODateTime(pto.reviewedAt || pto.updatedAt) : undefined}
            note={pto.reviewNote}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function HistoryItem({
  tone,
  icon: Icon,
  title,
  date,
  note,
}: {
  tone: 'primary' | 'success' | 'destructive' | 'muted';
  icon: typeof CircleDot;
  title: string;
  date?: string;
  note?: string | null;
}) {
  const toneClass = {
    primary: 'bg-primary/10 text-primary ring-primary/10',
    success: 'bg-success/10 text-success ring-success/10',
    destructive: 'bg-destructive/10 text-destructive ring-destructive/10',
    muted: 'bg-muted text-muted-foreground ring-muted',
  }[tone];

  return (
    <div className="relative flex min-w-0 gap-3">
      <div
        className={`z-10 flex size-6 shrink-0 items-center justify-center rounded-full ring-4 ring-background ${toneClass}`}
      >
        <Icon className="size-3.5" />
      </div>
      <div className="min-w-0 flex-1 pb-1">
        <div className="text-sm font-semibold text-foreground">{title}</div>
        <div className="mt-0.5 text-xs text-muted-foreground">{date ?? 'No decision yet'}</div>
        {note && (
          <div className="mt-3 rounded-md border border-card-border bg-muted/20 p-3 text-sm leading-5 text-muted-foreground">
            {note}
          </div>
        )}
      </div>
    </div>
  );
}

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}
