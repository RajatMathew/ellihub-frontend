import { Avatar, AvatarFallback } from '@/app/components/ui/avatar';
import { cn } from '@/app/lib/utils';
import { assigneeTone, initialsOf } from '@/modules/tasks/lib/assignee-tone';

/**
 * A person's initials, tinted the colour they carry everywhere else.
 *
 * The same three lines of `Avatar` + `AvatarFallback` + `assigneeTone` had been
 * written out in the filter pills, the card's reassign menu and that menu's
 * option list. Four copies of a chip is three too many for one that has to keep
 * agreeing with itself, so they all come through here now.
 *
 * `id` is what picks the tint, so an unassigned chip — no id — is deliberately
 * grey rather than a colour that would read as somebody.
 */
export function TaskAssigneeAvatar({
  id,
  name,
  size = 'md',
  className,
}: {
  id?: string | null;
  name?: string | null;
  /** `sm` for a chip inside a button or a list row, `md` on its own. */
  size?: 'sm' | 'md';
  className?: string;
}) {
  return (
    <Avatar className={cn(size === 'sm' ? 'size-5' : 'size-6', className)}>
      <AvatarFallback
        className={cn(
          'font-semibold',
          size === 'sm' ? 'text-[0.625rem]' : 'text-xs',
          id ? assigneeTone(id) : 'bg-muted text-muted-foreground'
        )}
      >
        {name ? initialsOf(name) : '—'}
      </AvatarFallback>
    </Avatar>
  );
}
