import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { formatPTODateTime } from '@/modules/hr/components/pto/shared';
import type { PTO } from '@/modules/hr/schemas/pto.schema';

interface PTOHistoryCardProps {
  pto: PTO;
}

export function PTOHistoryCard({ pto }: PTOHistoryCardProps) {
  const isPending = pto.status === 'PENDING';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xs font-semibold uppercase tracking-widest">
          History & Logs
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-2">
        <div className="relative space-y-8 before:absolute before:bottom-2 before:left-2 before:top-2 before:w-px before:bg-border">
          <HistoryItem tone="primary" title="Submitted" date={formatPTODateTime(pto.createdAt)} />
          <HistoryItem
            tone={isPending ? 'muted' : 'primary'}
            title={isPending ? 'Pending' : pto.status}
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
  title,
  date,
  note,
}: {
  tone: 'primary' | 'muted';
  title: string;
  date?: string;
  note?: string | null;
}) {
  return (
    <div className="relative flex gap-4 pl-1">
      <div
        className={`z-10 size-4 shrink-0 rounded-full ring-4 ring-background ${
          tone === 'primary' ? 'bg-primary' : 'bg-muted-foreground/20'
        }`}
      />
      <div className="min-w-0 space-y-1">
        <div className="text-xs font-bold uppercase tracking-wide text-foreground">{title}</div>
        {date && <div className="text-xs uppercase text-muted-foreground">{date}</div>}
        {note && (
          <div className="mt-3 rounded border border-border bg-muted/40 p-3 text-xs italic leading-relaxed text-muted-foreground">
            {note}
          </div>
        )}
      </div>
    </div>
  );
}
