import { describe, expect, test } from 'bun:test';

import {
  getEmailCid,
  getInlineEmailImageSources,
  isInlineEmailAttachment,
  normalizeEmailContentId,
  resolveEmailAttachmentUrl,
} from '../src/modules/email/lib/email-attachments';

describe('inline email attachment mapping', () => {
  test('normalizes provider and HTML cid values to the same key', () => {
    expect(normalizeEmailContentId('<Microsoft-Logo%2EPNG>')).toBe('microsoft-logo.png');
    expect(getEmailCid('cid:MICROSOFT-LOGO.PNG')).toBe('microsoft-logo.png');
    expect(getEmailCid('https://example.com/logo.png')).toBeNull();
  });

  test('maps a cid to its authenticated content URL', () => {
    const sources = getInlineEmailImageSources([
      {
        name: 'provider-generated-name',
        inline: true,
        contentId: '<microsoft-logo.png>',
        contentUrl: '/api/v1/email/accounts/a/messages/m/attachments/i',
      },
    ]);

    expect(sources.get('microsoft-logo.png')).toBe(
      '/api/v1/email/accounts/a/messages/m/attachments/i'
    );
  });

  test('uses the attachment name when an inline provider omits contentId', () => {
    const sources = getInlineEmailImageSources([
      {
        name: 'fallback-logo.png',
        inline: true,
        contentUrl: '/inline/fallback',
      },
    ]);

    expect(sources.get('fallback-logo.png')).toBe('/inline/fallback');
    expect(isInlineEmailAttachment({ name: 'document.pdf' })).toBe(false);
  });

  test('resolves relative content URLs against a separately hosted API', () => {
    expect(resolveEmailAttachmentUrl('/api/v1/email/attachment', 'https://api.example.com/')).toBe(
      'https://api.example.com/api/v1/email/attachment'
    );
  });
});
