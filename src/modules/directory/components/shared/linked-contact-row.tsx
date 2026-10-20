import { Button } from '@/app/components/ui/button';
import { Switch } from '@/app/components/ui/switch';
import { CircleUserRound, Pencil, X } from 'lucide-react';

/** One contact linked to a vendor or GC on its form: name, Primary, edit, remove. */
export function LinkedContactRow({
  name,
  isPrimary,
  onPrimaryChange,
  onEdit,
  onRemove,
}: {
  name: string;
  isPrimary: boolean;
  onPrimaryChange: (isPrimary: boolean) => void;
  /** Without it the row has no edit button. */
  onEdit?: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-lg border border-border bg-accent/50 px-4 py-3 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <CircleUserRound className="size-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0 break-words text-sm font-medium text-foreground">{name}</span>
      </div>
      <div className="flex items-center justify-between gap-3 sm:justify-end">
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          Primary
          <Switch checked={isPrimary} onCheckedChange={onPrimaryChange} />
        </label>
        <div className="flex items-center gap-1">
          {onEdit && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              mode="icon"
              className="size-7 text-muted-foreground hover:text-foreground"
              onClick={onEdit}
              aria-label={`Edit ${name}`}
            >
              <Pencil className="size-3.5" />
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            mode="icon"
            className="size-7 text-muted-foreground hover:text-destructive"
            onClick={onRemove}
            aria-label="Remove contact"
          >
            <X className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
