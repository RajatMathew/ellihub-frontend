import type { ReactNode } from 'react';

import { cn } from '@/app/lib/utils';

interface ProjectDetailFieldProps {
  label: string;
  children: ReactNode;
  className?: string;
}

export function ProjectDetailField({
  label,
  children,
  className,
}: ProjectDetailFieldProps) {
  return (
    <div className={cn('min-w-0', className)}>
      <div className="mb-1 text-xs font-medium uppercase tracking-normal text-muted-foreground">
        {label}
      </div>
      <div className="break-words text-sm font-semibold text-foreground">{children ?? '-'}</div>
    </div>
  );
}
