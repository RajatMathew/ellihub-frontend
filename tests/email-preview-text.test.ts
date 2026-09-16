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
