import { ToolbarSkeleton } from '@/app/components/toolbar/toolbar-skeleton';

export interface PageHeaderSkeletonProps {
  /** Mirrors `PageHeader`'s eyebrow row. */
  showEyebrow?: boolean;
  /** Mirrors `PageHeader`'s description row. */
  showDescription?: boolean;
  actionCount?: number;
  sticky?: boolean;
  className?: string;
}

/**
 * The loading shape of a `PageHeader`.
 *
 * Presets derive this from the same props they render when loaded, so the
 * skeleton and the header can never disagree about how many rows there are.
 */
export function PageHeaderSkeleton({
  showEyebrow = false,
  showDescription = true,
  actionCount = 1,
  sticky = true,
  className,
}: PageHeaderSkeletonProps) {
  return (
    <ToolbarSkeleton
      actionCount={actionCount}
      className={className}
      showMeta={showEyebrow}
      showSubtitle={showDescription}
      sticky={sticky}
    />
  );
}
