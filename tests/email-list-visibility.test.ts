import { describe, expect, test } from 'bun:test';

import {
  isEmailListShown,
  nextEmailListVisible,
} from '../src/modules/email/lib/email-list-visibility';

describe('nextEmailListVisible', () => {
  test('Elliot growing wide closes the list', () => {
    expect(nextEmailListVisible({ visible: true, agentHidList: false, agentHidesList: true })).toBe(
      false
    );
  });

  test('a list reopened beside a wide Elliot stays open while the panel is dragged', () => {
    // Every width change reports a layout; only the first wide one may close it.
    expect(nextEmailListVisible({ visible: true, agentHidList: true, agentHidesList: true })).toBe(
      true
    );
  });

  test('Elliot shrinking or closing gives the list back', () => {
    expect(
      nextEmailListVisible({ visible: false, agentHidList: true, agentHidesList: false })
    ).toBe(true);
  });

  test('a list the reader closed stays closed when a small Elliot opens or resizes', () => {
    expect(
      nextEmailListVisible({ visible: false, agentHidList: false, agentHidesList: false })
    ).toBe(false);
  });

  test('an open list is left open by a small Elliot', () => {
    expect(
      nextEmailListVisible({ visible: true, agentHidList: false, agentHidesList: false })
    ).toBe(true);
  });
});

describe('isEmailListShown', () => {
  test('a closed list is hidden on a wide screen', () => {
    expect(isEmailListShown({ visible: false, isMobile: false })).toBe(false);
  });

  test('a list closed on a wide screen comes back below lg, where nothing could reopen it', () => {
    expect(isEmailListShown({ visible: false, isMobile: true })).toBe(true);
  });

  test('an open list is shown everywhere', () => {
    expect(isEmailListShown({ visible: true, isMobile: false })).toBe(true);
    expect(isEmailListShown({ visible: true, isMobile: true })).toBe(true);
  });
});
