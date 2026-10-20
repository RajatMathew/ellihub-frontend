import { describe, expect, test } from 'bun:test';

import { sanitizeEmailHtml } from '../src/modules/email/lib/email-html-sanitize';
import {
  emailDraftBodyToEditorHtml,
  isEmptyEmailHtml,
  normalizePastedEmailHtml,
  plainTextToPastedHtml,
  richTextToEmailHtml,
} from '../src/modules/email/lib/email-rich-text';

/**
 * The clipboard payload Gmail writes when the selection is a bulleted list, a
 * right-aligned line, a 3x2 table and a signature — the exact content in the
 * issue's video.
 */
const GMAIL_CLIPBOARD_HTML = `
<meta http-equiv="content-type" content="text/html; charset=utf-8">
<!--StartFragment-->
<div dir="ltr">
  <ul>
    <li style="margin-left:15px">dasd</li>
    <li style="margin-left:15px">sdasd</li>
    <li style="margin-left:15px">adafrg</li>
  </ul>
  <div style="text-align:right">asdasdasdasdasdasfsdkgsfghs</div>
  <table style="border-collapse:collapse;width:100%" border="1" cellpadding="0" cellspacing="0">
    <tbody>
      <tr>
        <td style="border:1px solid rgb(204,204,204);padding:4px 8px">asd</td>
        <td style="border:1px solid rgb(204,204,204);padding:4px 8px">asdasf</td>
        <td style="border:1px solid rgb(204,204,204);padding:4px 8px">asfsdg</td>
      </tr>
      <tr>
        <td style="border:1px solid rgb(204,204,204);padding:4px 8px">asdaf</td>
        <td style="border:1px solid rgb(204,204,204);padding:4px 8px">asd</td>
        <td style="border:1px solid rgb(204,204,204);padding:4px 8px">adsfg</td>
      </tr>
    </tbody>
  </table>
  <div>Rajat Mathew,</div>
  <div>Cofount</div>
</div>
<!--EndFragment-->
`;

function countOccurrences(value: string, needle: RegExp) {
  return value.match(needle)?.length ?? 0;
}

describe('pasting formatted content from another email client', () => {
  test('keeps a bulleted list as a list', () => {
    const html = normalizePastedEmailHtml(GMAIL_CLIPBOARD_HTML);

    expect(html).toContain('<ul>');
    expect(countOccurrences(html, /<li\b/g)).toBe(3);
    expect(html).toContain('dasd');
    expect(html).toContain('adafrg');
    // The bullet indent the sender chose is presentation worth keeping.
    expect(html).toContain('margin-left: 15px');
  });

  test('keeps a 3x2 table as a real bordered table', () => {
    const html = normalizePastedEmailHtml(GMAIL_CLIPBOARD_HTML);

    expect(html).toContain('<table');
    expect(html).toContain('<tbody>');
    expect(countOccurrences(html, /<tr\b/g)).toBe(2);
    expect(countOccurrences(html, /<td\b/g)).toBe(6);
    expect(html).toContain('border="1"');
    expect(html).toContain('cellpadding="0"');
    expect(html).toContain('border-collapse: collapse');
    expect(html).toContain('border: 1px solid rgb(204,204,204)');
    expect(html).toContain('asfsdg');
  });

  test('keeps alignment and the signature block', () => {
    const html = normalizePastedEmailHtml(GMAIL_CLIPBOARD_HTML);

    expect(html).toContain('text-align: right');
    expect(html).toContain('<div>Rajat Mathew,</div>');
    expect(html).toContain('<div>Cofount</div>');
  });

  test('drops the clipboard wrapper cruft without dropping content', () => {
    const html = normalizePastedEmailHtml(GMAIL_CLIPBOARD_HTML);

    expect(html).not.toContain('<meta');
    expect(html).not.toContain('StartFragment');
    expect(html).not.toContain('http-equiv');
  });

  test('unwraps unknown elements rather than losing what they hold', () => {
    const html = normalizePastedEmailHtml(
      '<html><body><o:p><p>Word paragraph</p></o:p><form><p>In a form</p></form></body></html>'
    );

    expect(html).toContain('<p>Word paragraph</p>');
    expect(html).toContain('<p>In a form</p>');
    expect(html).not.toContain('<o:p>');
    expect(html).not.toContain('<form>');
  });

  test('falls back to the plain-text flavour when there is no HTML', () => {
    const html = plainTextToPastedHtml('Hi Team,\n\nDetails below\n  indented');

    expect(html).toBe('Hi Team,<br><br>Details below<br>&nbsp;&nbsp;indented');
  });
});

describe('sanitising pasted HTML', () => {
  test('removes scripts together with their source', () => {
    const html = normalizePastedEmailHtml(
      '<p>Before</p><script>window.alert("pwned")</script><p>After</p>'
    );

    expect(html).not.toContain('script');
    expect(html).not.toContain('pwned');
    expect(html).toBe('<p>Before</p><p>After</p>');
  });

  test('strips event handlers while keeping the element', () => {
    const html = normalizePastedEmailHtml(
      '<img src="https://example.com/logo.png" alt="Logo" onerror="alert(1)" onload="alert(2)">'
    );

    expect(html).not.toContain('onerror');
    expect(html).not.toContain('onload');
    expect(html).not.toContain('alert');
    expect(html).toContain('src="https://example.com/logo.png"');
    expect(html).toContain('alt="Logo"');
  });

  test('drops scripted and entity-obfuscated URLs', () => {
    const html = normalizePastedEmailHtml(
      '<a href="javascript:alert(1)">one</a>' +
        '<a href="java&#115;cript:alert(2)">two</a>' +
        '<a href="https://example.com">three</a>'
    );

    expect(html).not.toContain('javascript');
    expect(html).not.toContain('href="java');
    expect(html).toContain(
      '<a href="https://example.com" target="_blank" rel="noopener noreferrer">three</a>'
    );
    expect(html).toContain('>one</a>');
  });

  test('drops style, svg and iframe payloads with their contents', () => {
    const html = normalizePastedEmailHtml(
      '<style>body{background:red}</style>' +
        '<svg><script>alert(1)</script></svg>' +
        '<iframe src="https://evil.example"></iframe>' +
        '<p>Kept</p>'
    );

    expect(html).toBe('<p>Kept</p>');
  });

  test('filters inline styles down to the presentational ones', () => {
    const html = normalizePastedEmailHtml(
      '<p style="color:#333;text-align:center;position:fixed;background-image:url(https://evil.example/x.png);' +
        'behavior:url(#default#time2);font-weight:bold">Styled</p>'
    );

    expect(html).toContain('color: #333');
    expect(html).toContain('text-align: center');
    expect(html).toContain('font-weight: bold');
    expect(html).not.toContain('position');
    expect(html).not.toContain('background-image');
    expect(html).not.toContain('evil.example');
    expect(html).not.toContain('behavior');
  });

  test('escapes stray angle brackets instead of trusting them as markup', () => {
    const html = normalizePastedEmailHtml('<p>5 < 7 and a < b</p>');

    expect(html).toBe('<p>5 &lt; 7 and a &lt; b</p>');
  });

  test('balances unclosed markup so the output parses the way it was written', () => {
    const html = sanitizeEmailHtml('<div><b>bold<i>both</div>tail');

    expect(html).toBe('<div><b>bold<i>both</i></b></div>tail');
  });

  test('closes an open paragraph or cell when a sibling starts', () => {
    expect(sanitizeEmailHtml('<p>one<p>two')).toBe('<p>one</p><p>two</p>');
    expect(sanitizeEmailHtml('<table><tr><td>a<td>b</table>')).toBe(
      '<table><tr><td>a</td><td>b</td></tr></table>'
    );
  });
});

describe('the draft round trip', () => {
  test('formatting survives being saved and reopened', () => {
    const editorHtml = normalizePastedEmailHtml(GMAIL_CLIPBOARD_HTML);

    // What saveDraft/sendDraft send with bodyType: 'html'.
    const savedBody = richTextToEmailHtml(editorHtml);
    // What the draft's stored body turns back into when the composer reopens it.
    const reopenedHtml = emailDraftBodyToEditorHtml([savedBody]);

    expect(reopenedHtml).toContain('<ul>');
    expect(countOccurrences(reopenedHtml, /<li\b/g)).toBe(3);
    expect(countOccurrences(reopenedHtml, /<tr\b/g)).toBe(2);
    expect(countOccurrences(reopenedHtml, /<td\b/g)).toBe(6);
    expect(reopenedHtml).toContain('border: 1px solid rgb(204,204,204)');
    expect(reopenedHtml).toContain('text-align: right');
    expect(reopenedHtml).toContain('Cofount');
    // Idempotent, so repeated save/reopen cycles cannot erode the markup.
    expect(richTextToEmailHtml(reopenedHtml)).toBe(savedBody);
  });

  test('linkifies typed URLs on the way out but not inside existing links', () => {
    const body = richTextToEmailHtml(
      '<div>See www.example.com</div><div><a href="https://a.example">https://a.example</a></div>'
    );

    expect(body).toContain(
      '<a href="https://www.example.com" target="_blank" rel="noopener noreferrer">www.example.com</a>'
    );
    expect(countOccurrences(body, /<a\b/g)).toBe(2);
  });

  test('reads a plain-text draft body back as HTML', () => {
    expect(emailDraftBodyToEditorHtml('Line one\nLine two')).toBe('Line one<br>Line two');
    expect(emailDraftBodyToEditorHtml(undefined)).toBe('');
    expect(emailDraftBodyToEditorHtml(['<div><br></div>'])).toBe('');
  });

  test('never sends a body a provider would reject as empty', () => {
    expect(richTextToEmailHtml('')).toBe('<div><br></div>');
    expect(richTextToEmailHtml('<div><br></div>')).toBe('<div><br></div>');
  });
});

describe('detecting an empty composer body', () => {
  test('treats browser filler markup as empty', () => {
    expect(isEmptyEmailHtml('')).toBe(true);
    expect(isEmptyEmailHtml('<br>')).toBe(true);
    expect(isEmptyEmailHtml('<div><br></div>')).toBe(true);
    expect(isEmptyEmailHtml('<div>&nbsp;</div>')).toBe(true);
  });

  test('treats text and structural content as written', () => {
    expect(isEmptyEmailHtml('<div>Hi</div>')).toBe(false);
    expect(isEmptyEmailHtml('<table><tr><td></td></tr></table>')).toBe(false);
    expect(isEmptyEmailHtml('<img src="https://example.com/a.png">')).toBe(false);
  });
});

describe('the signature marker', () => {
  test('survives saving a draft and loading it back into the editor', () => {
    const body = '<div>Approved.</div><div class="elli-signature"><p>Elli Admin</p></div>';

    expect(emailDraftBodyToEditorHtml(richTextToEmailHtml(body))).toContain(
      '<div class="elli-signature"><p>Elli Admin</p></div>'
    );
  });

  test('is read back from Outlook’s x_-prefixed class, and kept without the prefix', () => {
    expect(sanitizeEmailHtml('<div class="x_elli-signature"><p>EA</p></div>')).toBe(
      '<div class="elli-signature"><p>EA</p></div>'
    );
  });

  test('is the only class kept, and only on a div', () => {
    expect(sanitizeEmailHtml('<div class="MsoNormal elli-signature bg-red-500">x</div>')).toBe(
      '<div class="elli-signature">x</div>'
    );
    expect(sanitizeEmailHtml('<p class="elli-signature">x</p>')).toBe('<p>x</p>');
    expect(sanitizeEmailHtml('<div class="MsoNormal">x</div>')).toBe('<div>x</div>');
  });
});
