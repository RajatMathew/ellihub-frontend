/**
 * Adding a vendor's quote and correcting one already submitted are the same
 * card: `mode: 'edit'` arrives prefilled from the quote on file. These are the
 * rules that differ between the two.
 */

type QuoteDraft = {
  mode?: 'submit' | 'edit';
  quotedAmount?: number | null;
  /** A file picked or found for this proposal. */
  hasNewAttachment: boolean;
  /** Files already on the quote (edit mode). */
  existingAttachments?: Array<{ fileId: string; fileName: string }>;
};

export function isQuoteEdit(draft: { mode?: 'submit' | 'edit' }): boolean {
  return draft.mode === 'edit';
}

/** Why the quote cannot be saved yet, or null. */
export function quoteActionBlocker(draft: QuoteDraft): string | null {
  const hasFile = draft.hasNewAttachment || (draft.existingAttachments?.length ?? 0) > 0;
  if (!hasFile) return 'Attach the quote document before adding it.';
  if (!((draft.quotedAmount ?? 0) > 0)) return 'Enter a quoted amount greater than 0.';
  return null;
}

/**
 * The file list to save. Editing a quote replaces its files outright, so the
 * ones already on it go back with any new one; dropping them here would delete
 * them from the quote.
 */
export function quoteAttachmentIds(
  existing: Array<{ fileId: string }> | undefined,
  newFileId: string | null | undefined
): string[] {
  const ids = (existing ?? []).map((file) => file.fileId);
  if (newFileId) ids.push(newFileId);
  return [...new Set(ids)];
}
