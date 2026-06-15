import { cn } from '@/app/lib/utils';

interface InfoRowProps {
  label: string;
  children: React.ReactNode;
  className?: string;
  labelClassName?: string;
  valueClassName?: string;
  labelVariant?: 'default' | 'light' | 'lighter';
}

export function InfoRow({
  label,
  children,
  className,
  labelClassName,
  valueClassName,
  labelVariant = 'default',
}: InfoRowProps) {
  const labelVariantClasses = {
    default: 'text-muted-foreground',
    light: 'text-label-light',
    lighter: 'text-label-lighter',
  };

  return (
    <div className={cn('flex min-w-0 items-start justify-between gap-3', className)}>
      <span
        className={cn(
          'min-w-0 shrink-0 text-sm font-semibold',
          labelVariantClasses[labelVariant],
          labelClassName
        )}
      >
        {label}
      </span>
      <span className={cn('min-w-0 break-words text-end text-sm font-bold', valueClassName)}>
        {children}
      </span>
    </div>
  );
}
