import type { ReactNode } from 'react';

import { BreadcrumbEllipsis } from '@/app/components/ui/breadcrumb';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';

interface BreadcrumbMenuProps {
  children: ReactNode;
  /** Accessible name for the trigger, also used as its tooltip. */
  label: string;
}

/**
 * The dropdown behind a breadcrumb's ellipsis — the crumbs that did not fit,
 * so a collapsed trail can still be walked back up.
 */
export function BreadcrumbMenu({ children, label }: BreadcrumbMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={label}
          title={label}
          className="inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-surface-hover data-[state=open]:text-foreground"
        >
          <BreadcrumbEllipsis className="size-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="max-h-[min(24rem,60vh)] w-64 overflow-y-auto p-1.5"
      >
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
