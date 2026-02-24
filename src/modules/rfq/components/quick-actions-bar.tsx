import { BarChart2, Mail } from 'lucide-react';

import { Button } from '@app/components/ui/button';

export function QuickActionsBar({
  quotesReceived,
  onCompare,
}: {
  quotesReceived: number;
  onCompare: () => void;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center gap-2.5">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Quick Actions
      </span>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          className="gap-1.5 bg-[var(--color-success-accent,theme(colors.green.600))] hover:bg-[var(--color-success-accent,theme(colors.green.600))]/90 text-white border-transparent"
          onClick={onCompare}
        >
          <BarChart2 className="size-3.5" />
          Compare {quotesReceived} Quotes
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Mail className="size-3.5" />
          Email All Vendors
        </Button>
      </div>
    </div>
  );
}
