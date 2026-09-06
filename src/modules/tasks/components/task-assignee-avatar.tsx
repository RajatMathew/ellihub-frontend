import { Avatar, AvatarFallback } from '@/app/components/ui/avatar';
import { getOutlookAvatarStyle, getOutlookInitials } from '@/app/lib/outlook-avatar';
import { cn } from '@/app/lib/utils';

/**
 * A person, drawn the way the mail side draws them.
 *
 * Colour and initials both come from `outlook-avatar` rather than from a tint
 * of the theme, so somebody assigned a task looks the same as they do in the
 * email assignee list — and, since that module is a port of Fluent's own
 * avatars, the same as they do in Outlook. Two schemes for one person was the
 * whole of elli-ui#798.
 *
 * Keyed on the **name**, not the id, because that is the only input both sides
 * share: the mail side colours senders, who are often not users here and have
 * no id at all. The cost is that a rename changes somebody's colour, which is
 * already true of every avatar in the mailbox.
 */
export function TaskAssigneeAvatar({
  name,
  size = 'md',
  className,
}: {
  name?: string | null;
  /** `sm` for a chip inside a button or a list row, `md` on its own. */
  size?: 'sm' | 'md';
  className?: string;
}) {
  const initials = name ? getOutlookInitials(name) : '';

  return (
    <Avatar className={cn(size === 'sm' ? 'size-5' : 'size-6', className)}>
      <AvatarFallback
        className={cn(
          'font-semibold uppercase',
          size === 'sm' ? 'text-[0.625rem]' : 'text-xs',
          // Unassigned has no name to colour from, and should not look like a
          // person either, so it keeps the theme's own grey.
          !name && 'bg-muted text-muted-foreground'
        )}
        // Exact Outlook avatar colours — see outlook-avatar.ts. Inline because
        // they are Microsoft's values, deliberately not design-system tokens.
        style={name ? getOutlookAvatarStyle(name) : undefined}
      >
        {/* Fluent returns nothing for a name it cannot abbreviate - a phone
            number, or a script that does not use initials - and shows a question
            mark rather than inventing letters. */}
        {name ? initials || '?' : '—'}
      </AvatarFallback>
    </Avatar>
  );
}
