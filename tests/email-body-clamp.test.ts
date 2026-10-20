import { describe, expect, test } from 'bun:test';

import { CLAMP_HEIGHT, clampMaxHeight } from '../src/modules/email/lib/email-body-clamp';

describe('clampMaxHeight', () => {
  test('leaves an expanded body uncapped so the quote can animate open inside it', () => {
    expect(
      clampMaxHeight({ overflows: true, expanded: true, toggling: false, contentHeight: 900 })
    ).toBeUndefined();
  });

  test('pins the measured height only while Show more / Show less is animating', () => {
    expect(
      clampMaxHeight({ overflows: true, expanded: true, toggling: true, contentHeight: 900 })
    ).toBe(900);
  });

  test('folds a long body to the clamp height', () => {
    expect(
      clampMaxHeight({ overflows: true, expanded: false, toggling: false, contentHeight: 900 })
    ).toBe(CLAMP_HEIGHT);
  });

  test('never caps a body that fits', () => {
    expect(
      clampMaxHeight({ overflows: false, expanded: false, toggling: false, contentHeight: 300 })
    ).toBeUndefined();
  });
});
