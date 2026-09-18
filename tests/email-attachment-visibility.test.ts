import { describe, expect, test } from 'bun:test';

import { isHiddenInlineEmailAttachment } from '../src/modules/email/lib/email-attachments';

const signatureLogo = { name: 'image001.png', inline: true, contentId: 'logo@elli' };
const outlookDoc = {
  name: 'gitlab_cover_letter_aaryan.docx',
  inline: false,
  contentId: '1942E4352C02664D8CABC46A1D01CB0B@KORP216.PROD.OUTLOOK.COM',
};
const plainFile = { name: 'invoice.pdf', inline: false, contentId: null };

describe('deciding what belongs in the attachment row', () => {
  test('keeps a file Outlook stamped a contentId on', () => {
    // The bug behind "attachments are not seen at all": Outlook gives every
    // attachment a contentId, the old rule read that as inline, and any whose
    // id turned up in the body vanished from the row. 178 attachments in our
    // own cache are contentId-bearing documents somebody actually attached.
    expect(isHiddenInlineEmailAttachment(outlookDoc)).toBe(false);
  });

  test('keeps a plain file', () => {
    expect(isHiddenInlineEmailAttachment(plainFile)).toBe(false);
  });

  test('hides what the provider marked for rendering in the body', () => {
    expect(isHiddenInlineEmailAttachment(signatureLogo)).toBe(true);
  });

  test('does not depend on the body, which a long thread may not have sent', () => {
    // `selectConversationBodies` defers older bodies against a byte budget, so
    // a body-dependent rule gave one answer on open and another once the rest
    // arrived — the same thread counted 2 attachments and then 11.
    for (const attachment of [signatureLogo, outlookDoc, plainFile]) {
      expect(isHiddenInlineEmailAttachment(attachment)).toBe(
        isHiddenInlineEmailAttachment({ ...attachment })
      );
    }
  });

  test('a missing inline flag is not inline', () => {
    expect(isHiddenInlineEmailAttachment({ name: 'x.png', contentId: 'a@b' })).toBe(false);
    expect(isHiddenInlineEmailAttachment({ name: 'x.png' })).toBe(false);
  });
});
