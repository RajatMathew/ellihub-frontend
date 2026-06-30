import type { ReactNode } from 'react';

import { cn } from '@/app/lib/utils';

interface ProjectDetailFieldProps {
  label: string;
  children: ReactNode;
  className?: string;
}

export function ProjectDetailField({ label, children, className }: ProjectDetailFieldProps) {
  return (
    <div className={cn('min-w-0', className)}>
      <div className="mb-1 min-w-0 break-words text-xs font-medium uppercase tracking-normal text-muted-foreground [overflow-wrap:anywhere]">
        {label}
      </div>
      <div className="min-w-0 break-words text-sm font-semibold text-foreground [overflow-wrap:anywhere]">
        {children ?? '-'}
      </div>
    </div>
  );
}
