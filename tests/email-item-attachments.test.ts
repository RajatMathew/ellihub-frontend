import { describe, expect, test } from 'bun:test';

import {
  emailAttachmentDisplayName,
  isEmailItemAttachment,
} from '../src/modules/email/lib/email-attachments';

describe('an email attached to an email', () => {
  test('is recognised by its MIME type', () => {
    expect(isEmailItemAttachment('message/rfc822')).toBe(true);
    expect(isEmailItemAttachment('MESSAGE/RFC822')).toBe(true);
    expect(isEmailItemAttachment(' message/rfc822 ')).toBe(true);
    expect(isEmailItemAttachment('application/pdf')).toBe(false);
    expect(isEmailItemAttachment(null)).toBe(false);
    expect(isEmailItemAttachment(undefined)).toBe(false);
  });

  test('gets the extension its subject-derived name never had', () => {
    // The chip in elli-ui#954 read "Payment" — an anonymous 582 KB file that
    // told the reader nothing and saved as something nothing could open.
    expect(emailAttachmentDisplayName({ name: 'Payment', mimeType: 'message/rfc822' })).toBe(
      'Payment.eml'
    );
  });

  test('does not double up an extension it already has', () => {
    expect(emailAttachmentDisplayName({ name: 'Payment.eml', mimeType: 'message/rfc822' })).toBe(
      'Payment.eml'
    );
    expect(emailAttachmentDisplayName({ name: 'Payment.EML', mimeType: 'message/rfc822' })).toBe(
      'Payment.EML'
    );
  });

  test('leaves a real file alone, extension or not', () => {
    expect(emailAttachmentDisplayName({ name: 'invoice.pdf', mimeType: 'application/pdf' })).toBe(
      'invoice.pdf'
    );
    expect(emailAttachmentDisplayName({ name: 'scan', mimeType: 'application/pdf' })).toBe('scan');
  });

  test('never renders a nameless attachment as an empty chip', () => {
    expect(emailAttachmentDisplayName({ name: '   ', mimeType: 'application/pdf' })).toBe(
      'Attachment'
    );
  });
});
