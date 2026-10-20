/**
 * Which request a draft save becomes.
 *
 * `PUT /drafts/:id` opens by writing subject, body and recipients back to the
 * provider — about a second of round trip, measured against Outlook. On the
 * attach path those are values the server already holds: the composer sends the
 * *last persisted* form, not what has been typed since, so the write changed
 * nothing and the user waited for it anyway.
 *
 * So an attach goes to its own endpoint, which only uploads. The request body
 * is deliberately the same either way: only Office365 can add an attachment in
 * isolation, and Gmail and Zoho drafts are rebuilt wholesale on every edit, so
 * the server falls those providers through to the ordinary save. Sending the
 * whole draft is what lets it.
 */
export type DraftSaveTarget = { method: 'POST' | 'PUT'; path: string };

export function getDraftSaveTarget(options: {
  accountId: string;
  draftId?: string;
  /** This save is only adding files. */
  attachOnly?: boolean;
}): DraftSaveTarget {
  const { accountId, draftId, attachOnly } = options;
  const drafts = `/email/accounts/${accountId}/drafts`;

  // No draft yet, so there is nothing to attach to: this is a create whatever
  // prompted it.
  if (!draftId) return { method: 'POST', path: drafts };

  return attachOnly
    ? { method: 'POST', path: `${drafts}/${draftId}/attachments` }
    : { method: 'PUT', path: `${drafts}/${draftId}` };
}
