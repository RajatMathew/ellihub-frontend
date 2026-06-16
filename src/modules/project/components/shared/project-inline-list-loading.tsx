import { Skeleton } from '@/app/components/ui/skeleton';
import { cn } from '@/app/lib/utils';

interface ProjectInlineListLoadingProps {
  rows?: number;
  rowClassName?: string;
}

export function ProjectInlineListLoading({
  rows = 3,
  rowClassName,
}: ProjectInlineListLoadingProps) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className={cn('h-14 rounded-lg', rowClassName)} />
      ))}
    </div>
  );
}
