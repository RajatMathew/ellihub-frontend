import type { ReactNode } from 'react';

import { Skeleton } from '@/app/components/ui/skeleton';

import { formatSummary } from './format-summary';
import { PageHeader } from './page-header';
import type { ActionDef, PageHeaderTabs, SummaryDef } from './page-header.types';

export interface ListPageHeaderProps {
  /** Parent section label, above the title. Most list pages omit it. */
  eyebrow?: ReactNode;
  title: string;
  /** The result-set descriptor. Rendered unless `description` replaces it. */
  summary?: SummaryDef;
  /** Replaces the generated summary. It never suppresses the line entirely. */
  description?: ReactNode;
  actions?: ActionDef[];
  leadingActions?: ReactNode;
  tabs?: PageHeaderTabs;
  isLoading?: boolean;
  className?: string;
}

/**
 * The header for a page that lists records.
 *
 * A list page's title is static and known before the data arrives, so loading
 * skeletons only the descriptor line — the title never flickers. Detail pages
 * do the opposite; see `DetailPageHeader`.
 */
export function ListPageHeader({
  eyebrow,
  title,
  summary,
  description,
  actions,
  leadingActions,
  tabs,
  isLoading,
  className,
}: ListPageHeaderProps) {
  const descriptor = isLoading ? (
    <Skeleton className="h-4 w-32" />
  ) : (
    (description ??
    (summary ? (
      <span className="text-sm text-muted-foreground">{formatSummary(summary)}</span>
    ) : null))
  );

  return (
    <PageHeader
      actions={actions}
      className={className}
      description={descriptor}
      eyebrow={eyebrow}
      leadingActions={leadingActions}
      tabs={tabs}
      title={title}
    />
  );
}
