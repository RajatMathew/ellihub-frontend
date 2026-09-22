/**
 * Who a list row is about.
 *
 * In the Inbox that is the sender, and always has been. In Sent and Drafts it
 * is not: every message there was written by the account holder, so labelling
 * those rows with the sender printed the same name on every line and said
 * nothing about any of them (elli-ui#1115). Those folders are labelled with the
 * recipient instead, prefixed `To:` so the two kinds of row stay tellable apart
 * at a glance — the convention every mail client uses.
 *
 * The decision is made per row, from the row's own folder, rather than from the
 * folder being viewed: a search spans folders, and a sent message found from the
 * Inbox should still read as one.
 */

/** Folders whose messages the reader sent, so the other party is the recipient. */
const OUTGOING_FOLDERS = new Set(['sent', 'drafts']);

export type EmailRowCorrespondent = {
  /**
   * What to render in the row's truncating name slot — the `To:` prefix and
   * the one name, and deliberately NOT the `+N`.
   *
   * The name is the part that may be cut; the count is not. Concatenating them
   * put `+2` at the end of a truncating span, so the row that most needed it
   * ("this went to three people") was exactly the row long enough to lose it:
   * `To: Sebastian Woskolej +2` rendered as `To: Sebastian Woskolej …`. The
   * count is rendered beside this, unshrinking, the way the thread count is.
   */
  label: string;
  /** Recipients after the first, for that separate span. 0 renders nothing. */
  othersCount: number;
  /** The whole thing in one string, for aria-labels and tooltips. */
  fullLabel: string;
  /** The bare name, without the prefix or the count. Drives the avatar. */
  name: string;
  /** The address behind that name, for the avatar's photo lookup. */
  email: string;
  /** True when this row is labelled by recipient rather than sender. */
  outgoing: boolean;
};

export type EmailRowCorrespondentInput = {
  /**
   * The server's well-known folder key (`inbox`, `sent`, `drafts`, …).
   *
   * Read in preference to `folder` because the mailbox page repurposes that
   * field: it overwrites the key with the folder *id* when it maps rows for
   * the list, so by the time a row is rendered `folder` is a ULID and no
   * longer says which kind of folder this is.
   */
  folderKey?: string | null;
  folder?: string | null;
  senderName?: string | null;
  senderEmail?: string | null;
  recipientName?: string | null;
  recipientEmail?: string | null;
  recipientCount?: number | null;
};

export function isOutgoingEmailFolder(folder?: string | null): boolean {
  return OUTGOING_FOLDERS.has((folder ?? '').toLowerCase());
}

export function emailRowCorrespondent(email: EmailRowCorrespondentInput): EmailRowCorrespondent {
  const senderName = email.senderName?.trim() || email.senderEmail?.trim() || 'Unknown sender';

  if (!isOutgoingEmailFolder(email.folderKey ?? email.folder)) {
    return {
      label: senderName,
      othersCount: 0,
      fullLabel: senderName,
      name: senderName,
      email: email.senderEmail?.trim() || '',
      outgoing: false,
    };
  }

  const recipientName = email.recipientName?.trim() || email.recipientEmail?.trim() || '';
  // A draft can genuinely have no recipient yet. "To: (no recipient)" is the
  // honest label — falling back to the sender would put the account holder's
  // own name back on the row, which is the bug.
  const named = recipientName || '(no recipient)';
  // Everyone after the first, the way a mail client counts them. The count is
  // the total, so one recipient adds nothing.
  const others = Math.max(0, (email.recipientCount ?? 0) - 1);
  const label = `To: ${named}`;

  return {
    label,
    othersCount: others,
    fullLabel: others > 0 ? `${label} +${others}` : label,
    // The avatar gets the one person, not the tally: initials of
    // "Aaryan Narayani +2" would be "A+".
    name: named,
    email: email.recipientEmail?.trim() || '',
    outgoing: true,
  };
}
