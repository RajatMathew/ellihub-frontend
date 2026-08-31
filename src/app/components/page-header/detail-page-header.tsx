import type { ReactNode } from 'react';

import { Link } from 'react-router-dom';

import { PageHeader } from './page-header';
import { PageHeaderSkeleton } from './page-header-skeleton';
import type { ActionDef, MetaItem, PageHeaderTabs, PanelDef } from './page-header.types';

export interface DetailPageHeaderProps {
  /** Label of the list this record belongs to, e.g. `Vendors`. */
  backLabel: string;
  /** Defaults to the parent path. Pass a value only when the route nests deeper. */
  backTo?: string;
  title: ReactNode;
  /** Badges qualifying the record — status, type, sync state. */
  status?: ReactNode;
  /** A prose subtitle. Records that describe themselves in labelled pairs use `meta` instead. */
  description?: ReactNode;
  meta?: MetaItem[];
  actions?: ActionDef[];
  panel?: PanelDef;
  leadingActions?: ReactNode;
  tabs?: PageHeaderTabs;
  isLoading?: boolean;
  className?: string;
}

/**
 * The header for a single record.
 *
 * The eyebrow is a back link and nothing more. The full trail is rendered once,
 * globally, by `HeaderBreadcrumbs` — a page that draws its own trail puts two
 * on screen at once.
 *
 * A detail page's title is the record's name, which is unknown until the query
 * resolves, so loading skeletons the whole header rather than flashing a
 * placeholder title.
 */
export function DetailPageHeader({
  backLabel,
  backTo = '..',
  title,
  status,
  description,
  meta,
  actions,
  panel,
  leadingActions,
  tabs,
  isLoading,
  className,
}: DetailPageHeaderProps) {
  if (isLoading) {
    return (
      <PageHeaderSkeleton
        actionCount={actions?.length ?? 2}
        className={className}
        showDescription={Boolean(description) || Boolean(meta?.length)}
        showEyebrow
      />
    );
  }

  return (
    <PageHeader
      actions={actions}
      className={className}
      description={description}
      eyebrow={
        <Link to={backTo} relative="path" className="transition-colors hover:text-foreground">
          {backLabel}
        </Link>
      }
      leadingActions={leadingActions}
      meta={meta}
      panel={panel}
      status={status}
      tabs={tabs}
      title={title}
    />
  );
}
