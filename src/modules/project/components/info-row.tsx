import { cn } from '@app/lib/utils';

interface InfoRowProps {
  label: string;
  children: React.ReactNode;
  className?: string;
  valueClassName?: string;
}

export function InfoRow({ label, children, className, valueClassName }: InfoRowProps) {
  return (
    <div className={cn('flex items-center justify-between py-1.5', className)}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn('text-sm font-medium text-end', valueClassName)}>{children}</span>
    </div>
  );
}
