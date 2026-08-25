import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/app/components/ui/breadcrumb';
import { BreadcrumbMenu } from '@/app/components/ui/breadcrumb-menu';
import { DropdownMenuItem } from '@/app/components/ui/dropdown-menu';
import { cn } from '@/app/lib/utils';
import { Home } from 'lucide-react';

export interface FilesBreadcrumbEntry {
  id: string;
  name: string;
}

interface FilesBreadcrumbsProps {
  breadcrumbs: FilesBreadcrumbEntry[];
  rootLabel?: string;
  /** Lets embedders drop the page-level bottom margin when inlining this. */
  className?: string;
  onBreadcrumbClick: (folderId?: string) => void;
}

const MAX_VISIBLE_ENTRIES = 2;

export function FilesBreadcrumbs({
  breadcrumbs,
  rootLabel = 'Files',
  className,
  onBreadcrumbClick,
}: FilesBreadcrumbsProps) {
  if (breadcrumbs.length === 0) return null;

  const shouldCollapse = breadcrumbs.length > MAX_VISIBLE_ENTRIES;
  const visibleStartIndex = shouldCollapse ? breadcrumbs.length - MAX_VISIBLE_ENTRIES : 0;
  const visibleEntries = breadcrumbs.slice(visibleStartIndex);
  const hiddenEntries = breadcrumbs.slice(0, visibleStartIndex);

  return (
    <Breadcrumb className={cn('mb-4 w-full min-w-0 max-w-full overflow-hidden', className)}>
      <BreadcrumbList className="w-full min-w-0 flex-nowrap overflow-hidden">
        <BreadcrumbItem className="min-w-0 shrink-0">
          <BreadcrumbLink asChild>
            <button
              type="button"
              className="flex max-w-[7.5rem] min-w-0 cursor-pointer items-center gap-1.5 overflow-hidden whitespace-nowrap sm:max-w-48"
              onClick={() => onBreadcrumbClick(undefined)}
              title={rootLabel}
            >
              <Home className="size-3.5 shrink-0" />
              <span className="min-w-0 truncate">{rootLabel}</span>
            </button>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {shouldCollapse && (
          <>
            <BreadcrumbSeparator className="shrink-0" />
            <BreadcrumbItem className="shrink-0">
              <BreadcrumbMenu label="Show hidden folders">
                {hiddenEntries.map((entry) => (
                  <DropdownMenuItem
                    key={entry.id}
                    className="min-h-9"
                    onSelect={() => onBreadcrumbClick(entry.id)}
                  >
                    <span className="truncate">{entry.name}</span>
                  </DropdownMenuItem>
                ))}
              </BreadcrumbMenu>
            </BreadcrumbItem>
          </>
        )}

        {visibleEntries.map((entry, visibleIndex) => {
          const originalIndex = visibleStartIndex + visibleIndex;
          const isLast = originalIndex === breadcrumbs.length - 1;

          return (
            <span key={entry.id} className="contents">
              <BreadcrumbSeparator className="shrink-0" />
              <BreadcrumbItem className={cn('min-w-0', isLast ? 'flex-1' : 'shrink-0')}>
                {isLast ? (
                  <BreadcrumbPage className="block min-w-0 max-w-full truncate" title={entry.name}>
                    {entry.name}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <button
                      type="button"
                      className="block max-w-[7.5rem] min-w-0 cursor-pointer truncate text-left sm:max-w-44"
                      onClick={() => onBreadcrumbClick(entry.id)}
                      title={entry.name}
                    >
                      {entry.name}
                    </button>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </span>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
