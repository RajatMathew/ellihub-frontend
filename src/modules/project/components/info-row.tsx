import { cn } from '@app/lib/utils';

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
    <div className={cn('flex items-center justify-between', className)}>
      <span
        className={cn(
          'text-[13px] font-semibold',
          labelVariantClasses[labelVariant],
          labelClassName
        )}
      >
        {label}
      </span>
      <span className={cn('text-[13px] font-bold text-end', valueClassName)}>{children}</span>
    </div>
  );
}
