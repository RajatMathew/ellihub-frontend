import { cn } from '@/app/lib/utils';
import type { EmailRowAction } from '@/modules/email/lib/email-row-actions';
import { Archive, ArchiveRestore, Flag, Pin, PinOff, Trash2 } from 'lucide-react';

interface EmailRowActionIconProps {
  action: EmailRowAction;
  /** The size — the row's own buttons and the swipe drawer draw it at different ones. */
  className?: string;
}

/**
 * The glyph for a row action, the same in the row's own icon buttons and in
 * the swipe drawer. The two toggles show their state: a set flag is filled,
 * and a pinned conversation offers the struck-through pin that takes it off.
 */
export function EmailRowActionIcon({ action, className }: EmailRowActionIconProps) {
  switch (action.key) {
    case 'flag':
      return (
        <Flag
          aria-hidden="true"
          className={cn(className, action.pressed && 'fill-destructive text-destructive')}
        />
      );
    case 'pin': {
      const Icon = action.pressed ? PinOff : Pin;
      return <Icon aria-hidden="true" className={cn(className, '-rotate-45')} />;
    }
    case 'archive':
      return <Archive aria-hidden="true" className={className} />;
    case 'unarchive':
      return <ArchiveRestore aria-hidden="true" className={className} />;
    case 'delete':
      return <Trash2 aria-hidden="true" className={className} />;
  }
}
