import { describe, expect, test } from 'bun:test';

import {
  markQuotedEmailContent,
  QUOTED_CONTENT_ATTRIBUTE,
} from '../src/modules/email/lib/email-quoted-content';

function parse(html: string) {
  return new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
}

const header = (from: string, sent: string) =>
  `<div><p><b>From:</b> ${from}</p><p><b>Sent:</b> ${sent}</p>` +
  `<p><b>To:</b> Procurement</p><p><b>Subject:</b> RE: Payment</p></div>`;

/**
 * Outlook does not nest a long thread — it flattens it. Every round lands as a
 * sibling of the reply: header, that round's prose, the next header, its prose,
 * for as many rounds as the thread has had.
 *
 * Each round's prose reads as the sender's own writing, so the boundary search
 * walks past round after round and collapses only the last one. On the real
 * thread behind elli-ui#954 — 110 siblings, four rounds — 4,325 characters
 * stayed on screen and 435 went behind the toggle.
 */
describe('a thread Outlook flattened into siblings', () => {
  const body =
    `<div class="WordSection1">` +
    `<p>Good morning,</p>` +
    `<p>It seems that there are 2 invoices for $123.00. Please advise which to apply.</p>` +
    `<p>Thank you.</p>` +
    header('Procurement', 'Monday, September 14, 2026 2:13 AM') +
    `<p>Not a problem.</p>` +
    `<p>Once checks are received, please send an updated statement.</p>` +
    header('Victor Igel', 'Monday, September 14, 2026 2:10 AM') +
    `<p>Cari,</p>` +
    `<p>Thanks, I apologize. I will have Debra check why we did not post this.</p>` +
    header('Procurement', 'Monday, September 14, 2026 2:07 AM') +
    `<p>Hi Victor, regarding payment for Inv#2170, this invoice has already been paid.</p>` +
    `</div>`;

  test.skip('collapses from the first round, not only the last (elli-ui#954)', () => {
    const doc = parse(body);
    markQuotedEmailContent(doc);

    const hidden = doc.querySelector(`[${QUOTED_CONTENT_ATTRIBUTE}]`)?.textContent ?? '';
    // Everything from the first "From:" down is history.
    expect(hidden).toContain('Not a problem');
    expect(hidden).toContain('Cari,');
    expect(hidden).toContain('regarding payment for Inv#2170');
    // The reader's own message stays visible.
    expect(hidden).not.toContain('It seems that there are 2 invoices');
  });

  test('today it collapses only the final round — this is the bug, pinned', () => {
    const doc = parse(body);
    markQuotedEmailContent(doc);

    const hidden = doc.querySelector(`[${QUOTED_CONTENT_ATTRIBUTE}]`)?.textContent ?? '';
    expect(hidden).toContain('regarding payment for Inv#2170');
    // Earlier rounds are still on screen, which is what the issue reports.
    expect(hidden).not.toContain('Not a problem');
  });
});
