import { describe, expect, test } from 'bun:test';

import {
  prefersBodyFocus,
  resolveComposeAutoFocusField,
} from '../src/modules/email/lib/email-compose-focus';
import { getReplyComposeSeed } from '../src/modules/email/lib/email-reply-compose';

describe('compose auto focus', () => {
  test('an empty new message starts in the recipient field', () => {
    expect(prefersBodyFocus({ to: '' })).toBe(false);
    expect(resolveComposeAutoFocusField({ preferBody: false, hasFocusInside: false })).toBe('to');
  });

  test('a reopened draft starts in the body', () => {
    expect(prefersBodyFocus({ isEditingDraft: true, to: '' })).toBe(true);
    expect(resolveComposeAutoFocusField({ preferBody: true, hasFocusInside: false })).toBe('body');
  });

  test('a message opened with a recipient already filled starts in the body', () => {
    expect(prefersBodyFocus({ to: ' someone@example.com ' })).toBe(true);
  });

  test('never moves the caret once it is already inside the editor', () => {
    // elli-ui#1011: the open-focus decision used to run a frame (or several)
    // late, by which time the user had committed their first To chip and the
    // "open" focus yanked the caret into the message body.
    expect(resolveComposeAutoFocusField({ preferBody: true, hasFocusInside: true })).toBeNull();
    expect(resolveComposeAutoFocusField({ preferBody: false, hasFocusInside: true })).toBeNull();
  });
});

describe('reply compose seed', () => {
  test('a reply targets the sender and starts in the body', () => {
    const seed = getReplyComposeSeed({ mode: 'reply', senderEmail: 'dana@example.com' });
    expect(seed.to).toBe('dana@example.com');
    expect(seed.title).toBe('Reply');
    expect(seed.preferBodyFocus).toBe(true);
    expect(prefersBodyFocus({ to: seed.to })).toBe(true);
  });

  test('a forward has no recipient yet, so it starts in the To field', () => {
    const seed = getReplyComposeSeed({ mode: 'forward', senderEmail: 'dana@example.com' });
    expect(seed.to).toBe('');
    expect(seed.title).toBe('Forward');
    expect(seed.preferBodyFocus).toBe(false);
    expect(
      resolveComposeAutoFocusField({ preferBody: seed.preferBodyFocus, hasFocusInside: false })
    ).toBe('to');
  });
});
