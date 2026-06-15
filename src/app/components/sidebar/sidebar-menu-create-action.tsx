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
            'ms-auto flex !h-6 !w-6 !min-w-6 shrink-0 items-center justify-center rounded-md p-0 text-zinc-300',
            'opacity-0 pointer-events-none transition-[opacity,color,background-color,box-shadow]',
            'hover:bg-white/[0.16] hover:text-white hover:shadow-sm focus-visible:bg-white/[0.16] focus-visible:text-white focus-visible:opacity-100',
            'group-hover/sidebar-menu-item:pointer-events-auto group-hover/sidebar-menu-item:bg-white/[0.10] group-hover/sidebar-menu-item:opacity-100',
            'group-focus-within/sidebar-menu-item:pointer-events-auto group-focus-within/sidebar-menu-item:bg-white/[0.10] group-focus-within/sidebar-menu-item:opacity-100'
          )}
        >
          <Plus className="size-3.25 opacity-100" strokeWidth={2.25} />
        </Link>
      </TooltipTrigger>
      <TooltipContent
        side="bottom"
        align="center"
        sideOffset={7}
        className="rounded-md border border-white/10 bg-zinc-800 px-2.5 py-1.5 text-xs font-normal text-zinc-100 shadow-md shadow-black/25 dark:bg-zinc-800 dark:text-zinc-100"
      >
        {title}
      </TooltipContent>
    </Tooltip>
  );
}
