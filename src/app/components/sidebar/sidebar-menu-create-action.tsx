import { Tooltip, TooltipContent, TooltipTrigger } from '@/app/components/ui/tooltip';
import type { MenuItem } from '@/app/config/types';
import { cn } from '@/app/lib/utils';
import { Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

function getCreatePath(item: MenuItem): string | undefined {
  if (!item.createPath) return undefined;
  if (item.createPath !== true) return item.createPath;
  if (!item.path) return undefined;

  return `${item.path.replace(/\/$/, '')}/create`;
}

function getCreateTitle(item: MenuItem): string {
  return item.createTitle ?? `Create ${item.title ?? 'item'}`;
}

export function SidebarMenuCreateAction({
  item,
  createPath: resolvedCreatePath,
}: {
  item: MenuItem;
  createPath?: string;
}) {
  const createPath = resolvedCreatePath ?? getCreatePath(item);
  if (!createPath) return null;

  const title = getCreateTitle(item);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          to={createPath}
          aria-label={title}
          data-slot="sidebar-menu-create-action"
          className={cn(
            'ms-auto flex !h-5 !w-5 !min-w-5 flex-none! shrink-0 items-center justify-center rounded-sm p-0 text-sidebar-muted',
            'opacity-0 pointer-events-none transition-[opacity,color,background-color,box-shadow]',
            'hover:bg-sidebar-item-hover hover:text-sidebar-foreground hover:shadow-sm focus-visible:bg-sidebar-item-hover focus-visible:text-sidebar-foreground focus-visible:opacity-100',
            'group-hover/sidebar-menu-item:pointer-events-auto group-hover/sidebar-menu-item:opacity-100',
            'group-focus-within/sidebar-menu-item:pointer-events-auto group-focus-within/sidebar-menu-item:opacity-100'
          )}
        >
          <Plus className="size-3 opacity-100" strokeWidth={2.25} />
        </Link>
      </TooltipTrigger>
      <TooltipContent
        side="bottom"
        align="center"
        sideOffset={7}
        className="rounded-md border border-sidebar-border bg-sidebar-bg px-2.5 py-1.5 text-xs font-normal text-sidebar-foreground shadow-md shadow-black/25"
      >
        {title}
      </TooltipContent>
    </Tooltip>
  );
}
