import { describe, expect, test } from 'bun:test';

import { plainTextToEmailHtml } from '../src/modules/email/lib/email-body-format';

describe('outbound email body formatting', () => {
  test('preserves paragraph spacing with explicit line breaks', () => {
    const html = plainTextToEmailHtml('Hi Team,\n\nMeeting details\n\nRegards,\nRajat');

    expect(html).toContain('Hi Team,<br><br>Meeting details<br><br>Regards,<br>Rajat');
  });

  test('normalizes Windows line endings without leaving carriage returns', () => {
    const html = plainTextToEmailHtml('First line\r\nSecond line\r\n\r\nFourth line');

    expect(html).toContain('First line<br>Second line<br><br>Fourth line');
    expect(html).not.toContain('\r');
  });

  test('escapes HTML while preserving repeated spaces and tabs', () => {
    const html = plainTextToEmailHtml('<script>alert("x")</script>\n  indented\ttext');

    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;');
    expect(html).toContain('<br>&nbsp;&nbsp;indented&nbsp;&nbsp;&nbsp;&nbsp;text');
  });

  test('uses email-safe whitespace styles as an additional rendering hint', () => {
    const html = plainTextToEmailHtml('Content');

    expect(html).toStartWith('<div style="');
    expect(html).toContain('white-space: pre-wrap');
    expect(html).toEndWith('">Content</div>');
  });
});
