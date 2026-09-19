import { describe, expect, test } from 'bun:test';

import { emailSyncedActions } from '../src/modules/email/lib/email-synced-actions';

/**
 * elli-ui#965: the refetch used to ride on `newMail`, which the server sets
 * only for unread inbound Inbox mail. Every other publisher — a background
 * revalidation, a widened search or filter, a conversation that gained a
 * message — had a change to report and no toast to raise, so its event was
 * dropped and mail already in the server's cache stayed off the screen until
 * the reader hit refresh.
 */
describe('email.synced actions', () => {
  test('a change with nothing to announce still refetches', () => {
    // Mail that landed in Sent or Archive, a widened filter, a conversation
    // that gained a message. This is the case that was silently ignored.
    expect(emailSyncedActions({ changed: true })).toEqual({ refetch: true, notify: false });
  });

  test('new inbox mail both refetches and notifies', () => {
    expect(emailSyncedActions({ changed: true, newMail: { conversationId: 'thread-1' } })).toEqual({
      refetch: true,
      notify: true,
    });
  });

  test('a sync that moved nothing does neither', () => {
    // The server publishes after every sync run. Acting on those is what had a
    // quiet mailbox issuing a request every few seconds.
    expect(emailSyncedActions({})).toEqual({ refetch: false, notify: false });
    expect(emailSyncedActions({ changed: false, newMail: null })).toEqual({
      refetch: false,
      notify: false,
    });
  });

  test('new mail from an API too old to send the flag still refetches', () => {
    // The two repos deploy independently, and a toast over a list that never
    // updates is worse than either alone.
    expect(emailSyncedActions({ newMail: { conversationId: 'thread-1' } })).toEqual({
      refetch: true,
      notify: true,
    });
  });

  test('a newMail with no conversation to open raises nothing', () => {
    // The toast navigates to `conversationId`; without one there is nowhere to
    // send the reader, so it must not be shown.
    expect(emailSyncedActions({ changed: true, newMail: {} })).toEqual({
      refetch: true,
      notify: false,
    });
  });
});
