import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, test } from 'bun:test';

/**
 * The add-task popover fits the room it opens into.
 *
 * It is pinned to `side="bottom"` with `avoidCollisions={false}`, deliberately:
 * with collision avoidance on it flipped above the trigger whenever the details
 * panel neared the foot of the pane, so the same control opened in two places.
 * But the form is around 500px and the trigger sits low in that panel, so
 * staying below meant running off the bottom of the screen — the footer, and
 * the `Add task` button in it, ended up past the viewport edge with no way to
 * reach them short of zooming the browser out (elli-ui#1100).
 *
 * What keeps both true at once is the height cap. Radix's `size()` middleware
 * publishes `--radix-popover-content-available-height` whether or not collision
 * avoidance is on — it is a separate middleware from `flip` and `shift` — so the
 * sheet can be told to stop at the edge and let its fields scroll instead.
 *
 * Layout, so it is pinned from the source the way
 * `email-row-quick-actions.test.ts` pins the row's padding.
 */

function popoverSource(): string {
  return readFileSync(
    path.join(
      import.meta.dir,
      '..',
      'src',
      'modules',
      'email',
      'components',
      'mail-add-task-popover.tsx'
    ),
    'utf8'
  );
}

function popoverContentClasses(): string {
  const source = popoverSource();
  const content = source.slice(
    source.indexOf('<PopoverContent'),
    source.indexOf('</PopoverContent>')
  );
  const className = content.match(/className="([^"]+)"/)?.[1];

  if (!className) throw new Error('PopoverContent has no className to read');
  return className;
}

describe('the add-task popover is bounded by the space below the trigger', () => {
  test('its height is capped at the height Radix measured', () => {
    // Not a fixed max-h: a constant would be wrong on every viewport but one,
    // which is the same bug with a different number.
    expect(popoverContentClasses()).toContain(
      'max-h-[var(--radix-popover-content-available-height)]'
    );
  });

  test('it still opens below the trigger and never flips', () => {
    const source = popoverSource();

    // The cap is what makes staying below safe. Turning collision avoidance
    // back on would fix the overflow by reintroducing the flip this was set
    // for, so the two belong together.
    expect(source).toContain('side="bottom"');
    expect(source).toContain('avoidCollisions={false}');
  });

  test('the sheet is a column that clips, so a child can own the scrolling', () => {
    const classes = popoverContentClasses();

    expect(classes).toContain('flex');
    expect(classes).toContain('flex-col');
    expect(classes).toContain('overflow-hidden');
  });
});

describe('the squeeze lands on the fields, never on the footer', () => {
  test('the form fills the capped sheet', () => {
    const source = popoverSource();
    const form = source.slice(source.indexOf('<form'), source.indexOf('onSubmit='));

    // Without `min-h-0` a flex child refuses to shrink below its content, and
    // the overflow reappears one level down.
    expect(form).toContain('min-h-0');
    expect(form).toContain('flex-1');
  });

  test('the fields scroll', () => {
    const source = popoverSource();
    const fields = source.slice(
      source.indexOf('<div className="flex min-h-0 flex-1'),
      source.indexOf('mail-add-task-text')
    );

    expect(fields).toContain('overflow-y-auto');
    expect(fields).toContain('min-h-0');
    expect(fields).toContain('flex-1');
  });

  test('the footer holding Add task cannot be shrunk away', () => {
    const source = popoverSource();
    const footer = source.slice(source.lastIndexOf('<div className="flex shrink-0 items-center'));

    expect(footer).toContain('shrink-0');
    // The button it must keep on screen.
    expect(footer).toContain('type="submit"');
  });
});
