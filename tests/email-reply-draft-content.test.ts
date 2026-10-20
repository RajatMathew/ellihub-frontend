import { describe, expect, test } from 'bun:test';

import { replyDraftHasContent } from '../src/modules/email/lib/email-reply-draft-content';

/**
 * What Escape is allowed to throw away (elli-ui#1092).
 *
 * Closing the inline composer drops the draft, so Escape only does it silently
 * on a composer nobody has typed into. Everything below is a case where
 * getting that wrong either loses work or puts a confirmation in front of a
 * reader who has written nothing.
 */

const empty = {
  body: '',
  attachmentCount: 0,
  to: '',
  cc: '',
  bcc: '',
  seedTo: '',
};

describe('whether an inline reply is holding anything', () => {
  test('a composer nobody has touched is empty', () => {
    expect(replyDraftHasContent(empty)).toBe(false);
  });

  test('the editor’s own empty markup does not count as typing', () => {
    // The rich-text editor never leaves the field as ''. If this read as
    // content, Escape would ask before closing every untouched reply.
    for (const body of ['<p></p>', '<p><br></p>', '<p>&nbsp;</p>', '   ']) {
      expect(replyDraftHasContent({ ...empty, body })).toBe(false);
    }
  });

  test('the signature it opened with is not something the reader wrote', () => {
    // Every reply now opens with the mailbox signature in it. Counting that as
    // content would put "Discard this reply?" in front of every untouched one.
    const signature =
      '<div><br></div><div class="elli-signature"><p>Thank you,</p><p>Elli Admin</p>' +
      '<p><img src="https://api.example.com/api/v1/mail/signature-assets/elli-logo.png"></p></div>';

    expect(replyDraftHasContent({ ...empty, body: signature })).toBe(false);
    expect(replyDraftHasContent({ ...empty, body: `<div>Approved.</div>${signature}` })).toBe(true);
  });

  test('a single word is worth asking about', () => {
    expect(replyDraftHasContent({ ...empty, body: '<p>ok</p>' })).toBe(true);
  });

  test('an attachment counts even with nothing written', () => {
    expect(replyDraftHasContent({ ...empty, attachmentCount: 1 })).toBe(true);
  });

  test('the recipient a reply opened with is not something the reader typed', () => {
    // A reply seeds `to` from the sender, so a filled field is the default,
    // not work — asking about it would put a dialog in front of every Escape.
    const seedTo = 'mahavir@example.com';
    expect(replyDraftHasContent({ ...empty, to: seedTo, seedTo })).toBe(false);
    expect(replyDraftHasContent({ ...empty, to: ` ${seedTo} `, seedTo })).toBe(false);
  });

  test('a recipient changed from the one it opened with is', () => {
    expect(
      replyDraftHasContent({ ...empty, to: 'someone@example.com', seedTo: 'mahavir@example.com' })
    ).toBe(true);
  });

  test('a forward opens with no recipient, so any address is typed', () => {
    expect(replyDraftHasContent({ ...empty, to: 'someone@example.com' })).toBe(true);
  });

  test('cc and bcc count on their own', () => {
    expect(replyDraftHasContent({ ...empty, cc: 'someone@example.com' })).toBe(true);
    expect(replyDraftHasContent({ ...empty, bcc: 'someone@example.com' })).toBe(true);
    // Whitespace is not an address.
    expect(replyDraftHasContent({ ...empty, cc: '   ', bcc: '  ' })).toBe(false);
  });
});
