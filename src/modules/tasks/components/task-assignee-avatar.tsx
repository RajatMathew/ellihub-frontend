import { Avatar, AvatarFallback } from '@/app/components/ui/avatar';
import { getOutlookAvatarStyle, getOutlookInitials } from '@/app/lib/outlook-avatar';
import { cn } from '@/app/lib/utils';
import { UserPlus } from 'lucide-react';

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
 *
 * Unassigned draws a person rather than a dash. The dash read as a minus sign
 * and so as a control that takes something away — several people took it for a
 * remove button (#818). `UserPlus` says both what the slot is for and that
 * somebody can be put in it, which is the one thing you would want to do with
 * an empty one.
 *
 * The opaque base under the fallback is #821. Fluent's colours are opaque, so a
 * person's chip no longer mixes with anything — but the unassigned one is still
 * a theme tint, and a selected filter pill would otherwise show through it.
 */
export function TaskAssigneeAvatar({
  name,
  size = 'md',
  className,
}: {
  name?: string | null;
  /** `sm` for a chip inside a button or a list row, `md` on its own, `lg` on a task card, at the TaskCard design's 22px. */
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const initials = name ? getOutlookInitials(name) : '';

  return (
    <Avatar
      className={cn(
        'rounded-full bg-background',
        size === 'sm' ? 'size-5' : size === 'lg' ? 'size-5.5' : 'size-6',
        className
      )}
    >
      <AvatarFallback
        className={cn(
          'font-semibold uppercase',
          size === 'sm'
            ? 'text-[0.625rem]'
            : size === 'lg'
              ? 'text-[9.5px] tracking-[0.02em]'
              : 'text-xs',
          // Unassigned has no name to colour from, and should not look like a
          // person either: an empty slot is a fine dashed ring in the theme's
          // grey, not a filled chip, so it reads as a place rather than a person.
          !name &&
            'border border-dashed border-muted-foreground/50 bg-background text-muted-foreground'
        )}
        // Exact Outlook avatar colours — see outlook-avatar.ts. Inline because
        // they are Microsoft's values, deliberately not design-system tokens.
        style={name ? getOutlookAvatarStyle(name) : undefined}
      >
        {name ? (
          // Fluent returns nothing for a name it cannot abbreviate — a phone
          // number, or a script that does not use initials — and shows a
          // question mark rather than inventing letters.
          initials || '?'
        ) : (
          // Hidden from the accessibility tree: the trigger around this already
          // announces "Unassigned. Choose assignee", and a second voice on the
          // icon would only repeat it.
          <UserPlus
            aria-hidden
            className={size === 'sm' ? 'size-3' : size === 'lg' ? 'size-3' : 'size-3.5'}
          />
        )}
      </AvatarFallback>
    </Avatar>
  );
}
