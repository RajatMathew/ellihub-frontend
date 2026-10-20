import { cn } from '@/app/lib/utils';
import { Check, Copy, Pencil, RotateCcw, Trash2 } from 'lucide-react';

/**
 * Hover strip that lives just below a timed event block. Rendered inside the
 * event block's outer wrapper so `.group:hover` on the block picks up hover on
 * the strip and keeps it visible. The block itself owns an invisible bridge
 * span that fills the visual gap so cursor transit doesn't lose the hover
 * state — see email-calendar-timed-block.tsx.
 */
export function CalendarQuickActions({
  done,
  onEdit,
  onDuplicate,
  onDelete,
  onToggleDone,
}: {
  done: boolean;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onToggleDone: () => void;
}) {
  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-x-0 top-full z-40 mt-1 flex items-center gap-1 rounded-md border border-border bg-background px-1 py-1 opacity-0 shadow-lg transition-all duration-100',
        'group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100',
        'translate-y-1 group-hover:translate-y-0 group-focus-within:translate-y-0'
      )}
      onClick={(event) => event.stopPropagation()}
    >
      <QuickActionButton
        label={done ? 'Mark not done' : 'Mark done'}
        icon={done ? <RotateCcw className="size-3.5" /> : <Check className="size-3.5" />}
        onClick={onToggleDone}
        tone={done ? undefined : 'success'}
      />
      <QuickActionButton
        label="Edit"
        icon={<Pencil className="size-3.5" />}
        onClick={onEdit}
      />
      <QuickActionButton
        label="Duplicate"
        icon={<Copy className="size-3.5" />}
        onClick={onDuplicate}
      />
      <QuickActionButton
        label="Delete"
        icon={<Trash2 className="size-3.5" />}
        onClick={onDelete}
        tone="destructive"
      />
    </div>
  );
}

function QuickActionButton({
  label,
  icon,
  onClick,
  tone,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  tone?: 'destructive' | 'success';
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        'flex size-7 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
        tone === 'destructive' && 'hover:bg-destructive/10 hover:text-destructive',
        tone === 'success' && 'hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400'
      )}
    >
      {icon}
    </button>
  );
}
