import { describe, expect, test } from 'bun:test';

import {
  agentPanelLayout,
  agentPanelSize,
  halfPanelWidth,
  HIDE_EMAIL_LIST_WIDTH,
  PUSH_CONTENT_WIDTH,
} from '../src/mock/agent-panel-layout';

// elli-ui#1056: on a phone, growing Elliot's panel into a workspace ran it off
// the left edge of the screen and pushed the mailbox out of view.

describe('Elliot’s panel on a phone', () => {
  const phone = { open: true, isMobile: true };

  test('never pushes or hides the mailbox, however wide it was set', () => {
    expect(agentPanelLayout({ ...phone, width: HIDE_EMAIL_LIST_WIDTH })).toMatchObject({
      pushesContent: false,
      hidesEmailList: false,
    });
  });

  test('offers no workspace toggle or resize handle', () => {
    expect(agentPanelLayout({ ...phone, width: 392 }).canResize).toBe(false);
  });

  test('is never wider than the screen', () => {
    expect(agentPanelLayout({ ...phone, width: HIDE_EMAIL_LIST_WIDTH }).cssWidth).toBe(
      `min(${HIDE_EMAIL_LIST_WIDTH}px, 100%)`
    );
  });
});

describe('Elliot’s panel on a wide screen', () => {
  const desktop = { open: true, isMobile: false };

  test('grows into a workspace that pushes, then hides, the email list', () => {
    expect(agentPanelLayout({ ...desktop, width: 392 })).toMatchObject({
      pushesContent: false,
      hidesEmailList: false,
      canResize: true,
    });
    expect(agentPanelLayout({ ...desktop, width: PUSH_CONTENT_WIDTH }).pushesContent).toBe(true);
    expect(agentPanelLayout({ ...desktop, width: HIDE_EMAIL_LIST_WIDTH }).hidesEmailList).toBe(
      true
    );
  });

  test('closed, affects nothing', () => {
    expect(agentPanelLayout({ open: false, width: 720, isMobile: false })).toMatchObject({
      pushesContent: false,
      hidesEmailList: false,
    });
  });
});

describe('the one size button (elli-ui#1370)', () => {
  test('says full screen whenever the panel fills the window', () => {
    expect(agentPanelSize({ fullscreen: true, width: 392 })).toBe('full');
  });

  test('says half once the panel pushes the mailbox aside, small before that', () => {
    expect(agentPanelSize({ fullscreen: false, width: 392 })).toBe('small');
    expect(agentPanelSize({ fullscreen: false, width: PUSH_CONTENT_WIDTH - 1 })).toBe('small');
    expect(agentPanelSize({ fullscreen: false, width: PUSH_CONTENT_WIDTH })).toBe('half');
    // A width dragged by hand still reads as the size it behaves like.
    expect(agentPanelSize({ fullscreen: false, width: 610 })).toBe('half');
  });

  test('half is half the window, never so narrow it floats over the mailbox', () => {
    expect(halfPanelWidth(1600)).toBe(800);
    expect(halfPanelWidth(900)).toBe(PUSH_CONTENT_WIDTH);
    expect(halfPanelWidth(0)).toBeGreaterThanOrEqual(PUSH_CONTENT_WIDTH);
    expect(halfPanelWidth(Number.NaN)).toBeGreaterThanOrEqual(PUSH_CONTENT_WIDTH);
  });
});
