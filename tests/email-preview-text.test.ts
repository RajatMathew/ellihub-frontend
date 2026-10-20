import { describe, expect, test } from 'bun:test';

import { cleanEmailPreview } from '../src/modules/email/lib/email-preview-text';

/**
 * Providers flatten a message to plain text to build `preview`, so every
 * horizontal rule in the original arrives as the characters that drew it. The
 * mailbox row rendered `Daily September 15, 2026 ____________` where Outlook's
 * own list shows the date alone.
 *
 * Verified against the cache behind that screenshot: 909 of 17988 messages
 * carry an underscore run, 47 an asterisk run, 41 a hyphen run.
 */
describe('cleanEmailPreview', () => {
  test('drops the rule a newsletter puts under its masthead', () => {
    expect(cleanEmailPreview('Daily   September 15, 2026\r\n_____________')).toBe(
      'Daily September 15, 2026'
    );
  });

  test('drops the rule Outlook writes above a quoted reply', () => {
    expect(cleanEmailPreview('Got it!\r\n\r\n_____________________________')).toBe('Got it!');
  });

  test('drops hyphen and asterisk rules too', () => {
    // Both are real: `------------------ Original ------------------` is the
    // Outlook variant behind #942, and one message rules off with asterisks.
    expect(cleanEmailPreview('Best Regards\r\n------------------')).toBe('Best Regards');
    expect(cleanEmailPreview('No change in opening date. **********************')).toBe(
      'No change in opening date.'
    );
  });

  test('keeps a run that is part of a word, because it is content', () => {
    // A real preview in the cache. These asterisks mask an address; they are
    // not a line, and a preview reading `IP:112...163` would be a lie.
    expect(cleanEmailPreview('Trade Center IP:112.***.***.163')).toBe(
      'Trade Center IP:112.***.***.163'
    );
  });

  test('keeps short runs, which are punctuation rather than rules', () => {
    expect(cleanEmailPreview('Wait -- what?')).toBe('Wait -- what?');
  });

  test('returns empty for a preview that is nothing but a rule', () => {
    // The row falls back to the meeting-response line when the preview is
    // blank, so a rule-only preview must read as blank rather than as content.
    expect(cleanEmailPreview('\r\n__________\r\n')).toBe('');
  });

  test('handles a missing preview', () => {
    expect(cleanEmailPreview(null)).toBe('');
    expect(cleanEmailPreview(undefined)).toBe('');
  });
});

describe('the quoted original inside a preview', () => {
  test('drops an Outlook reply header, keeping what the sender wrote', () => {
    // 774 of 21353 cached messages carry this shape. Outlook's own list shows
    // only the first sentence.
    expect(
      cleanEmailPreview(
        'Luz Please ask john if he heard who the low bidder was.\r\n________________________________\r\nFrom: John Whalen <team@buildingconnected.com>\r\nSent: Wednesday, January 8, 2025 9:02 AM\r\nTo: Elli - Estimating <estimating@ellicorp.com>\r\nSubject: RE: Invitation to bid'
      )
    ).toBe('Luz Please ask john if he heard who the low bidder was.');
  });

  test('drops a Gmail attribution line', () => {
    expect(
      cleanEmailPreview(
        'Received, thank you. On Tue, Aug 11, 2026 at 12:14 PM Elli - Procurement <procurement@ellicorp.com> wrote: Please find attached'
      )
    ).toBe('Received, thank you.');
  });

  test('cuts at an attribution that ends the preview', () => {
    // `preview` is truncated to a fixed length by the provider, so the run can
    // finish on its last label with no whitespace after it. Requiring `\s`
    // there missed two real messages.
    expect(
      cleanEmailPreview(
        'Best regards, On Sun, Aug 9, 2026 at 1:34 PM Abdoul <a@amecomny.com> wrote:'
      )
    ).toBe('Best regards,');
  });

  test('keeps a terse reply whole — those are the common ones', () => {
    // "No bid" is the entire message on dozens of rows. The cut leaving six
    // characters is correct, not a false positive.
    expect(
      cleanEmailPreview(
        'No bid From: Mike Klappas <MKlappas@technico-csi.com> Sent: Friday, January 3, 2025 11:33 AM To: Info <Info@ellicorp.com> Subject: Bid'
      )
    ).toBe('No bid');
  });

  test('leaves a read receipt entirely alone', () => {
    // 3259 of these in the corpus, and the labels ARE the message. A rule that
    // counted header labels instead of requiring From→Sent→To would blank
    // every one of them. Receipts never write From, and order To before Sent.
    const receipt =
      'Your message To: Andy Ligas Subject: RE: Q593 Payments / Lien Sent: Tuesday, March 12, 2024 4:07:53 PM (UTC-05:00) Eastern Time (US & Canada) was read on Tuesday, March 12, 2024';

    expect(cleanEmailPreview(receipt)).toBe(receipt);
  });

  test('does not cut at the word "on" in ordinary prose', () => {
    // A real preview. Without the date-token requirement the earliest match
    // wins, `on it, it says…` reaches `wrote:` inside the window, and the row
    // reads "I clicked".
    expect(
      cleanEmailPreview(
        'I clicked on it, it says "invalid link". On Wed, Sep 9, 2026 at 11:51 AM Lilibell Serraty <lilibell@ellicorp.com> wrote: Hi Karla, Please see below'
      )
    ).toBe('I clicked on it, it says "invalid link".');
  });

  test('keeps a bare forward rather than rendering an empty row', () => {
    // Nothing above the quote, so there is no reply to show instead. Same call
    // markQuotedEmailContent makes when it refuses to collapse such a body.
    const forward =
      'From: Fieldwire <support@fieldwire.com> Sent: Monday, May 18, 2026 12:24 PM To: Luz Bencosme <luz@ellicorp.com> Subject: [Fieldwire] Photo Export';

    expect(cleanEmailPreview(forward)).toBe(forward);
  });

  test('cuts at the outermost boundary when history nests', () => {
    expect(
      cleanEmailPreview(
        'Agreed. From: A <a@b.com> Sent: Mon To: C <c@d.com> Subject: X On Tue, Oct 18, 2022 at 8:43 PM A <a@b.com> wrote: older'
      )
    ).toBe('Agreed.');
  });

  test('still strips a rule that is not followed by a quote', () => {
    expect(cleanEmailPreview('Daily September 15, 2026 ____________')).toBe(
      'Daily September 15, 2026'
    );
  });
});
