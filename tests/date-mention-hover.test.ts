import { describe, expect, test } from 'bun:test';

import { shouldOpenOnHover } from '../src/modules/email/hooks/use-date-mention-popover';

const idle = { shown: null, armed: null };

describe('shouldOpenOnHover', () => {
  test('resting on a date with nothing open starts its popover', () => {
    expect(shouldOpenOnHover('monday', idle)).toBe(true);
  });

  test('a date whose popover closed under the pointer answers the next move', () => {
    // Escape closed it: nothing shown, nothing armed, the pointer never left.
    expect(shouldOpenOnHover('monday', { ...idle, shown: null })).toBe(true);
  });

  test('moving within a date that is already showing does not restart it', () => {
    expect(shouldOpenOnHover('monday', { ...idle, shown: 'monday' })).toBe(false);
  });

  test('moving within a date already waiting out the delay lets the timer run', () => {
    expect(shouldOpenOnHover('monday', { ...idle, armed: 'monday' })).toBe(false);
  });

  test('moving to the next date switches to it', () => {
    expect(shouldOpenOnHover('monday', { ...idle, shown: 'today' })).toBe(true);
    expect(shouldOpenOnHover('monday', { ...idle, armed: 'today' })).toBe(true);
  });
});
