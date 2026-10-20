import type { ComponentType, ReactNode } from 'react';

import { cn } from '@/app/lib/utils';
import { Loader2 } from 'lucide-react';

interface PickerChipProps {
  label: string;
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' }>;
  /** Set only on a chip that is a choice (a project), never on a shortcut. */
  selected?: boolean;
  loading?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

/**
 * One shortcut in the folder picker — a project to save under, or a folder
 * saved to recently. Both rows use this so they read as the same kind of
 * thing: a place one tap away. They used to be two different controls, a
 * full-size outline button beside a caption, and a chip of another size.
 */
export function PickerChip({
  label,
  icon: Icon,
  selected,
  loading = false,
  disabled = false,
  onClick,
}: PickerChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      title={label}
      className={cn(
        'inline-flex h-7 max-w-56 shrink-0 cursor-pointer items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60 motion-safe:transition-colors motion-safe:duration-100',
        selected
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground'
      )}
      onClick={onClick}
    >
      {loading ? (
        <Loader2 aria-hidden="true" className="size-3.5 shrink-0 animate-spin" />
      ) : (
        <Icon
          aria-hidden="true"
          className={cn('size-3.5 shrink-0', !selected && 'text-muted-foreground')}
        />
      )}
      <span className="truncate">{label}</span>
    </button>
  );
}

/** A captioned row of chips that scrolls sideways rather than wrapping. */
export function PickerChipRow({ caption, children }: { caption: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="w-14 shrink-0 text-xs font-medium text-muted-foreground">{caption}</span>
      <div
        role="group"
        aria-label={caption}
        className="flex min-w-0 gap-1.5 overflow-x-auto py-0.5"
      >
        {children}
      </div>
    </div>
  );
}
