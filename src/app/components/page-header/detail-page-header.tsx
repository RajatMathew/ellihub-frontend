import type { ReactNode } from 'react';

import { useParentResourceRoute } from '@/app/hooks/use-parent-resource-route';
import { Link } from 'react-router-dom';

import { DetailTitleRow } from './detail-title-row';
import { PageHeader } from './page-header';
import { PageHeaderSkeleton } from './page-header-skeleton';
import type {
  ActionDef,
  BadgeDef,
  MetaItem,
  PageHeaderTabs,
  PanelDef,
  ReferenceDef,
  StatusDef,
} from './page-header.types';

export interface DetailPageHeaderProps {
  /**
   * Label of the list this record belongs to. Defaults to that route's own
   * title — override only when the list is named differently in this context.
   */
  backLabel?: string;
  /**
   * Where the back link goes. Defaults to the list route, resolved from the
   * route tree. Pass a value only for a destination the route cannot express.
   */
  backTo?: string;
  title: ReactNode;
  /** The record's own number or reference, when the title is its name. */
  identifier?: ReactNode;
  /** The record's lifecycle state. Editable when it carries `options`. */
  status?: StatusDef;
  /** Qualifiers: type, category, flags. Not the lifecycle state. */
  badges?: BadgeDef[];
  /** Links to related records. */
  references?: ReferenceDef[];
  /** A one-off beside the title that carries its own logic. Use sparingly. */
  titleSlot?: ReactNode;
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
 * The link's target and label both come from the route tree, so they cannot
 * disagree. Hand-typed relative targets had: `../..` from a vendor detail URL
 * resolves to `/app/directory`, not the vendor list it was labelled with.
 *
 * A detail page's title is the record's name, which is unknown until the query
 * resolves, so loading skeletons the whole header rather than flashing a
 * placeholder title.
 */
export function DetailPageHeader({
  backLabel,
  backTo,
  title,
  identifier,
  status,
  badges,
  references,
  titleSlot,
  description,
  meta,
  actions,
  panel,
  leadingActions,
  tabs,
  isLoading,
  className,
}: DetailPageHeaderProps) {
  const parentRoute = useParentResourceRoute();
  const resolvedBackTo = backTo ?? parentRoute?.to;
  const resolvedBackLabel = backLabel ?? parentRoute?.label;

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
        resolvedBackTo && resolvedBackLabel ? (
          <Link to={resolvedBackTo} className="transition-colors hover:text-foreground">
            {resolvedBackLabel}
          </Link>
        ) : null
      }
      leadingActions={leadingActions}
      meta={meta}
      panel={panel}
      identifier={identifier}
      status={
        <DetailTitleRow
          status={status}
          badges={badges}
          references={references}
          titleSlot={titleSlot}
        />
      }
      tabs={tabs}
      title={title}
    />
  );
}
