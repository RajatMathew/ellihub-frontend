import { type ReactNode } from 'react';

import { cn } from '@app/lib/utils';

export interface DetailPanelProps {
  open: boolean;
  children: ReactNode;
  className?: string;
}

export function DetailPanel({ open, children, className }: DetailPanelProps) {
  if (!open) return null;

  return (
    <aside className={cn('w-85 shrink-0 border-l border-gray-200 bg-background', className)}>
      {children}
    </aside>
  );
}

export interface DetailPanelLayoutProps {
  panelOpen: boolean;
  mainContent: ReactNode;
  panelContent: ReactNode;
  className?: string;
}

export function DetailPanelLayout({
  panelOpen,
  mainContent,
  panelContent,
  className,
}: DetailPanelLayoutProps) {
  return (
    <div className={cn('flex gap-0', className)}>
      <div className="min-w-0 flex-1">{mainContent}</div>
      {panelOpen && (
        <aside className="w-85 shrink-0 border-l border-gray-200 bg-background">
          {panelContent}
        </aside>
      )}
    </div>
  );
}
