import { cn } from '@app/lib/utils';

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
