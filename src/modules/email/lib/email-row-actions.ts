export type EmailRowActionKey = 'flag' | 'pin' | 'archive' | 'unarchive' | 'delete';

export interface EmailRowAction {
  key: EmailRowActionKey;
  /** The verb alone — what the swipe drawer prints under the icon. */
  caption: string;
  /** The hover tooltip on the row's icon-only button. */
  tooltip: string;
  /** The full accessible name, subject and all. */
  label: string;
  /** Flag and pin are toggles and say which way they are set; the rest leave it out. */
  pressed?: boolean;
  /** The one action that throws the conversation away. */
  destructive: boolean;
  run: () => void;
}

/** What the row is told it may do. An absent handler is an action the row does not offer. */
export interface EmailRowActionHandlers {
  onToggleFlag?: () => void;
  onTogglePin?: () => void;
  onArchive?: () => void;
  /** Archive folder only: moves the conversation back to the Inbox. */
  onUnarchive?: () => void;
  onDelete?: () => void;
}

interface EmailRowActionState {
  subject: string;
  flagged: boolean;
  pinned: boolean;
}

/**
 * The actions a conversation row offers, in the order it draws them.
 *
 * One list for both places the row puts them — the icons that take the
 * timestamp's place under a mouse, and the drawer a finger swipes open. They
 * were two hand-written lists, and they drifted: the drawer was built with
 * Archive and Delete only, so on a phone Flag and Pin existed solely as the
 * always-on icons that cost the row its timestamp.
 *
 * Delete is last so it sits at the outer edge of the drawer, furthest from
 * where the swipe ends.
 */
export function emailRowActions(
  { subject, flagged, pinned }: EmailRowActionState,
  { onToggleFlag, onTogglePin, onArchive, onUnarchive, onDelete }: EmailRowActionHandlers
): EmailRowAction[] {
  const actions: EmailRowAction[] = [];

  if (onToggleFlag) {
    const verb = flagged ? 'Unflag' : 'Flag';
    actions.push({
      key: 'flag',
      caption: verb,
      tooltip: verb,
      label: `${verb} ${subject}`,
      pressed: flagged,
      destructive: false,
      run: onToggleFlag,
    });
  }
  if (onTogglePin) {
    const verb = pinned ? 'Unpin' : 'Pin';
    actions.push({
      key: 'pin',
      caption: verb,
      tooltip: pinned ? 'Unpin' : 'Pin to top',
      label: `${verb} ${subject}`,
      pressed: pinned,
      destructive: false,
      run: onTogglePin,
    });
  }
  if (onArchive) {
    actions.push({
      key: 'archive',
      caption: 'Archive',
      tooltip: 'Archive',
      label: `Archive ${subject}`,
      destructive: false,
      run: onArchive,
    });
  }
  if (onUnarchive) {
    actions.push({
      key: 'unarchive',
      caption: 'Unarchive',
      tooltip: 'Unarchive',
      label: `Unarchive ${subject}`,
      destructive: false,
      run: onUnarchive,
    });
  }
  if (onDelete) {
    actions.push({
      key: 'delete',
      caption: 'Delete',
      tooltip: 'Delete',
      label: `Delete ${subject}`,
      destructive: true,
      run: onDelete,
    });
  }

  return actions;
}
