import { Skeleton } from '@/app/components/ui/skeleton';
import { cn } from '@/app/lib/utils';

import { Toolbar, ToolbarActions, ToolbarHeading, ToolbarWrapper } from './toolbar';

interface ToolbarSkeletonProps {
  actionCount?: number;
  className?: string;
  headingClassName?: string;
  metaClassName?: string;
  showMeta?: boolean;
  showSubtitle?: boolean;
  sticky?: boolean;
  subtitleClassName?: string;
  titleClassName?: string;
}

export function ToolbarSkeleton({
  actionCount = 2,
  className,
  headingClassName,
  metaClassName,
  showMeta = true,
  showSubtitle = true,
  sticky = true,
  subtitleClassName,
  titleClassName,
}: ToolbarSkeletonProps) {
  return (
    <Toolbar sticky={sticky} className={className}>
      <ToolbarWrapper>
        <ToolbarHeading className={cn('min-w-0 flex-1', headingClassName)}>
          {showMeta && <Skeleton className={cn('h-3 w-40', metaClassName)} />}
          <Skeleton className={cn('h-8 w-full max-w-sm', titleClassName)} />
          {showSubtitle && <Skeleton className={cn('h-4 w-72 max-w-full', subtitleClassName)} />}
        </ToolbarHeading>

        {actionCount > 0 && (
          <ToolbarActions className="w-full sm:w-auto sm:justify-end">
            {Array.from({ length: actionCount }, (_, index) => (
              <Skeleton
                key={`toolbar-action-loader-${index}`}
                className={cn('h-8 rounded-md', index === 0 ? 'w-full sm:w-28' : 'w-8')}
              />
            ))}
          </ToolbarActions>
        )}
      </ToolbarWrapper>
    </Toolbar>
  );
}
