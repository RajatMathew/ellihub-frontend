import type { ReactNode } from 'react';

import { PageTabs } from '@/app/components/page-tabs';
import {
  Toolbar,
  ToolbarHeading,
  ToolbarPageTitle,
  ToolbarWrapper,
} from '@/app/components/toolbar/toolbar';
import { cn } from '@/app/lib/utils';

import { PageHeaderActions } from './page-header-actions';
import type { ActionDef, MetaItem, PageHeaderTabs, PanelDef } from './page-header.types';

export interface PageHeaderProps {
  /** Back link or parent label. One line, above the title. */
  eyebrow?: ReactNode;
  title: ReactNode;
  /** Badges that qualify the title — status, type, sync state. Sits beside it. */
  status?: ReactNode;
  /** The result-set or record descriptor, below the title. */
  description?: ReactNode;
  /** `LABEL: value` pairs, below the description. */
  meta?: MetaItem[];
  actions?: ActionDef[];
  panel?: PanelDef;
  /** Controls the action model cannot express, rendered before the actions. */
  leadingActions?: ReactNode;
  /** Rendered after everything else in the action row. Form submit lives here. */
  trailingActions?: ReactNode;
  tabs?: PageHeaderTabs;
  sticky?: boolean;
  className?: string;
}

/**
 * The one page header.
 *
 * Every header in the app is these regions: eyebrow, title, status, description,
 * meta, actions, panel toggle, tabs. Presets fill a subset — none of them invent
 * a region, which is what keeps headers consistent across modules.
 *
 * Prefer `ListPageHeader`, `DetailPageHeader` or `FormPageHeader` over calling
 * this directly.
 */
export function PageHeader({
  eyebrow,
  title,
  status,
  description,
  meta,
  actions,
  panel,
  leadingActions,
  trailingActions,
  tabs,
  sticky = true,
  className,
}: PageHeaderProps) {
  const hasMeta = meta !== undefined && meta.length > 0;

  return (
    <Toolbar sticky={sticky} className={className}>
      <ToolbarWrapper>
        <ToolbarHeading className="min-w-0 flex-1 gap-2 lg:gap-2.5">
          {eyebrow ? (
            <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              {eyebrow}
            </div>
          ) : null}

          <div className="flex min-w-0 max-w-full flex-wrap items-center gap-3">
            <ToolbarPageTitle>{title}</ToolbarPageTitle>
            {status}
          </div>

          {description}

          {hasMeta && (
            <div className="flex max-w-full flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
              {meta.map((item) => {
                const Icon = item.icon;

                return (
                  <span key={item.label} className="flex items-center gap-1.5">
                    {Icon && <Icon aria-hidden="true" className="size-3.5" />}
                    {item.label}:{' '}
                    <span className={cn('break-words text-foreground')}>{item.value}</span>
                  </span>
                );
              })}
            </div>
          )}
        </ToolbarHeading>

        <PageHeaderActions
          actions={actions}
          panel={panel}
          leadingActions={leadingActions}
          trailingActions={trailingActions}
        />
      </ToolbarWrapper>

      {tabs && <PageTabs items={tabs.items} ariaLabel={tabs.ariaLabel} />}
    </Toolbar>
  );
}
