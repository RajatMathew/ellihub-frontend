import { describe, expect, test } from 'bun:test';

import {
  EMAIL_ROW_CHECKED_SURFACE,
  EMAIL_ROW_RESTING_SURFACE,
  EMAIL_ROW_SELECTED_SURFACE,
  emailRowSurfaceClasses,
} from '../src/modules/email/lib/email-row-surface';

describe('emailRowSurfaceClasses', () => {
  test('tints the open conversation when it is also ticked', () => {
    // The regression: the checked tint used to be suppressed on the open row,
    // so ticking the conversation you were reading looked like nothing
    // happened (elli-ui#999).
    const classes = emailRowSurfaceClasses({ isSelected: true, isChecked: true });

    expect(classes).toContain(EMAIL_ROW_CHECKED_SURFACE);
  });

  test('keeps the selected ring and lift on a ticked open conversation', () => {
    // The tint must override only the background, never cost the row the
    // elevation that marks it as the thread in the reading pane.
    const classes = emailRowSurfaceClasses({ isSelected: true, isChecked: true });

    expect(classes).toContain(EMAIL_ROW_SELECTED_SURFACE);
    // The tint has to come after the selected surface, or tailwind-merge
    // resolves the background the wrong way round and the row stays white.
    expect(classes.indexOf(EMAIL_ROW_CHECKED_SURFACE)).toBeGreaterThan(
      classes.indexOf(EMAIL_ROW_SELECTED_SURFACE)
    );
  });

  test('tints a ticked row that is not open', () => {
    const classes = emailRowSurfaceClasses({ isSelected: false, isChecked: true });

    expect(classes).toContain(EMAIL_ROW_CHECKED_SURFACE);
    expect(classes).toContain(EMAIL_ROW_RESTING_SURFACE);
  });

  test('leaves an unticked open conversation untinted', () => {
    const classes = emailRowSurfaceClasses({ isSelected: true, isChecked: false });

    expect(classes).toContain(EMAIL_ROW_SELECTED_SURFACE);
    expect(classes).not.toContain(EMAIL_ROW_CHECKED_SURFACE);
  });

  test('leaves a resting row untinted and unlifted', () => {
    const classes = emailRowSurfaceClasses({ isSelected: false, isChecked: false });

    expect(classes).toEqual([EMAIL_ROW_RESTING_SURFACE]);
  });
});
