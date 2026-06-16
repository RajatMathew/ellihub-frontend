import { LayoutPanelLeft, MoreHorizontal, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router';

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@app/components/ui/breadcrumb';
import { Button } from '@app/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@app/components/ui/dropdown-menu';
import { cn } from '@app/lib/utils';

export interface PageHeaderBreadcrumb {
  label: string;
  href?: string;
}

export interface MetadataItem {
  label: string;
  value: string;
  className?: string;
}

export interface StatusItem {
  label: string;
  variant?: 'success' | 'warning' | 'destructive' | 'primary' | 'secondary';
  withDot?: boolean;
}

export interface ActionButton {
  label: string;
  icon?: LucideIcon;
  onClick?: () => void;
  href?: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'dashed';
  className?: string;
}

export interface MoreAction {
  label: string;
  icon?: LucideIcon;
  onClick?: () => void;
  href?: string;
  separator?: boolean;
  destructive?: boolean;
}

export interface PageHeaderProps {
  breadcrumbs?: PageHeaderBreadcrumb[];
  title: string;
  metadata?: MetadataItem[];
  status?: StatusItem;
  actions?: ActionButton[];
  moreActions?: MoreAction[];
  onTogglePanel?: () => void;
  panelOpen?: boolean;
  className?: string;
}

export function PageHeader({
  breadcrumbs,
  title,
  metadata,
  status,
  actions,
  moreActions,
  onTogglePanel,
  panelOpen,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn('space-y-4 pt-5 pb-6 mb-6 -mx-4 px-4 lg:-mx-7.5 lg:px-7.5 bg-background', className)}>
      {/* Breadcrumb Navigation */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumb>
          <BreadcrumbList className="text-[11px]">
            {breadcrumbs.map((crumb, index) => {
              const isLast = index === breadcrumbs.length - 1;
              return (
                <div key={index} className="flex items-center">
                  <BreadcrumbItem>
                    {isLast ? (
                      <BreadcrumbPage className="font-semibold tracking-[0.05em] text-gray-500 uppercase">
                        {crumb.label}
                      </BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink
                        asChild
                        className="font-semibold tracking-[0.05em] text-gray-500 uppercase hover:text-gray-700"
                      >
                        <Link to={crumb.href || '#'}>{crumb.label}</Link>
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                  {!isLast && <BreadcrumbSeparator className="[&>svg]:size-3" />}
                </div>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>
      )}

      {/* Main Header Row */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        {/* Left Section: Title + Metadata */}
        <div className="flex-1 space-y-2">
          <h1 className="text-[28px] leading-none font-bold tracking-tight text-gray-900 dark:text-white">
            {title}
          </h1>

          {(metadata || status) && (
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px]">
              {metadata?.map((item, index) => (
                <div key={index} className="flex items-center gap-1.5">
                  <span className="font-semibold tracking-[0.02em] text-gray-500 uppercase">
                    {item.label}:
                  </span>
                  <span
                    className={cn('font-semibold text-gray-900 dark:text-white', item.className)}
                  >
                    {item.value}
                  </span>
                </div>
              ))}

              {status && (
                <div className="flex items-center gap-1.5">
                  {status.withDot && <span className="size-1.5 rounded-full bg-emerald-500" />}
                  <span className="text-[13px] font-semibold tracking-[0.02em] text-emerald-600 uppercase">
                    {status.label}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Section: Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {actions?.map((action, index) => {
            const Icon = action.icon;
            const content = (
              <>
                {Icon && <Icon className="size-3.5 stroke-[2.5]" />}
                {action.label}
              </>
            );

            if (action.href) {
              return (
                <Button
                  key={index}
                  variant={action.variant || 'outline'}
                  size="sm"
                  asChild
                  className={cn('h-8 rounded-sm px-3 text-[13px] font-semibold', action.className)}
                >
                  <Link to={action.href}>{content}</Link>
                </Button>
              );
            }

            return (
              <Button
                key={index}
                variant={action.variant || 'outline'}
                size="sm"
                onClick={action.onClick}
                className={cn('h-8 rounded-sm px-3 text-[13px] font-semibold', action.className)}
              >
                {content}
              </Button>
            );
          })}

          {moreActions && moreActions.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="size-8 rounded-sm">
                  <MoreHorizontal className="size-4" />
                  <span className="sr-only">More options</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {moreActions.map((action, index) => {
                  if (action.separator) {
                    return <DropdownMenuSeparator key={index} />;
                  }

                  const Icon = action.icon;
                  return (
                    <DropdownMenuItem
                      key={index}
                      onClick={action.onClick}
                      className={cn(
                        action.destructive && 'text-destructive focus:text-destructive'
                      )}
                    >
                      {Icon && <Icon className="size-4" />}
                      {action.label}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* View Info toggle button - only show when panel is closed */}
          {onTogglePanel && !panelOpen && (
            <Button
              variant="outline"
              size="sm"
              onClick={onTogglePanel}
              className="h-8 rounded-sm px-3 text-[13px] font-semibold"
            >
              <LayoutPanelLeft className="size-3.5" />
              View Info
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
