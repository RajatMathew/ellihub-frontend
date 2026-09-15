import { describe, expect, test } from 'bun:test';

import { getDraftSaveTarget } from '../src/modules/email/lib/email-draft-save-target';

/**
 * Attaching a file must not ask the server to re-save the draft.
 *
 * `PUT /drafts/:id` opens by writing subject, body and recipients back to the
 * provider — about a second of round trip — and the composer's upload path
 * sends the *last persisted* form, so those are values the server already
 * holds. The write changed nothing and the user waited for it.
 */

describe('where a draft save is sent', () => {
  test('an attach skips the field write', () => {
    expect(
      getDraftSaveTarget({ accountId: 'account-1', draftId: 'draft-1', attachOnly: true })
    ).toEqual({ method: 'POST', path: '/email/accounts/account-1/drafts/draft-1/attachments' });
  });

  test('an ordinary save still writes the draft', () => {
    // Closing the composer has to persist what was typed; only the attach path
    // may skip it.
    expect(getDraftSaveTarget({ accountId: 'account-1', draftId: 'draft-1' })).toEqual({
      method: 'PUT',
      path: '/email/accounts/account-1/drafts/draft-1',
    });
  });

  test('the first attach still creates the draft', () => {
    // Nothing exists to attach to yet, so this is a create whatever prompted it.
    expect(getDraftSaveTarget({ accountId: 'account-1', attachOnly: true })).toEqual({
      method: 'POST',
      path: '/email/accounts/account-1/drafts',
    });
  });

  test('a create is a create even without the flag', () => {
    expect(getDraftSaveTarget({ accountId: 'account-1' })).toEqual({
      method: 'POST',
      path: '/email/accounts/account-1/drafts',
    });
  });
});
