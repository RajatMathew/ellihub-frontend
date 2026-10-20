import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { cn } from '@/app/lib/utils';
import { Columns2, Maximize2, Minimize2, type LucideIcon } from 'lucide-react';

import type { AgentPanelSize } from './agent-panel-layout';

const SIZES: Array<{ value: AgentPanelSize; label: string; hint: string; icon: LucideIcon }> = [
  { value: 'small', label: 'Small', hint: 'Over the mailbox', icon: Minimize2 },
  { value: 'half', label: 'Half width', hint: 'Beside the mailbox', icon: Columns2 },
  { value: 'full', label: 'Full screen', hint: 'The whole window', icon: Maximize2 },
];

/**
 * One button for the panel's size (elli-ui#1370), in place of the separate
 * workspace and full-screen buttons. Its icon is the size the panel is at, so
 * the header says how big it is without another control; the menu offers the
 * other two. `sizes` leaves out the ones that make no sense here — on a phone
 * the panel already fills the screen, so only full screen is offered.
 */
export function AgentSizeMenu({
  size,
  sizes = ['small', 'half', 'full'],
  onChange,
}: {
  size: AgentPanelSize;
  sizes?: readonly AgentPanelSize[];
  onChange: (size: AgentPanelSize) => void;
}) {
  const options = SIZES.filter((option) => sizes.includes(option.value));
  const Current = SIZES.find((option) => option.value === size)?.icon ?? Minimize2;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Window size"
          title="Window size"
          className="flex size-9 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-accent data-[state=open]:text-accent-foreground"
        >
          <Current className="size-4" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
          Window size
        </DropdownMenuLabel>
        {/* The current size is the muted row, not a radio dot. Still a radio
            group to a screen reader. */}
        <div role="group" aria-label="Window size">
          {options.map(({ value, label, hint, icon: Icon }) => {
            const current = value === size;
            return (
              <DropdownMenuItem
                key={value}
                role="menuitemradio"
                aria-checked={current}
                onSelect={() => onChange(value)}
                className={cn('gap-2.5 py-1.5', current && 'bg-muted')}
              >
                <Icon
                  className={cn('size-4', current ? 'text-foreground' : 'text-muted-foreground')}
                  aria-hidden="true"
                />
                <span className="flex flex-col">
                  <span className={cn('text-sm', current && 'font-medium')}>{label}</span>
                  <span className="text-xs text-muted-foreground">{hint}</span>
                </span>
              </DropdownMenuItem>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
