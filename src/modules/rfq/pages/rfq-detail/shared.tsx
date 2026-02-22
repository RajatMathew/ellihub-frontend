// ---------------------------------------------------------------------------
// Small shared UI components for the RFQ detail page
// ---------------------------------------------------------------------------

import { Badge } from '@app/components/ui/badge';
import { cn } from '@app/lib/utils';

import type { VendorStatus } from './types';

// ---------------------------------------------------------------------------
// VendorInitial
// ---------------------------------------------------------------------------

export function VendorInitial({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0].toUpperCase())
    .slice(0, 2)
    .join('');
  return (
    <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
      {initials}
    </span>
  );
}

// ---------------------------------------------------------------------------
// StatusBadge
// ---------------------------------------------------------------------------

export function StatusBadge({ status }: { status: VendorStatus }) {
  const map: Record<
    VendorStatus,
    {
      label: string;
      variant: 'success' | 'warning' | 'secondary';
      appearance: 'light' | 'outline';
    }
  > = {
    QUOTED: { label: 'Quoted', variant: 'success', appearance: 'light' },
    WAITING: { label: 'Waiting', variant: 'warning', appearance: 'light' },
    DECLINED: { label: 'Declined', variant: 'secondary', appearance: 'outline' },
  };
  const { label, variant, appearance } = map[status];
  return (
    <Badge variant={variant} appearance={appearance} size="sm">
      {label}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// StatCard
// ---------------------------------------------------------------------------

export function StatCard({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string | number;
  valueClassName?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-background px-5 py-4 min-w-0">
      <span className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className={cn('text-lg font-bold text-foreground', valueClassName)}>{value}</span>
    </div>
  );
}
