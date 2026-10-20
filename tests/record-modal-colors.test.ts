import { readFileSync } from 'node:fs';

import { describe, expect, test } from 'bun:test';

/**
 * elli-ui#1424: the task and event modals show a chosen date, time or tab in
 * the brand colour, never in black. Style is not reachable from a pure-logic
 * test, so this guards the source of every picker in both modals.
 */
const PICKERS = [
  'src/modules/tasks/components/task-modal/task-due-field.tsx',
  'src/modules/email/components/calendar/event-modal/month-grid.tsx',
  'src/modules/email/components/calendar/event-modal/event-when-field.tsx',
  'src/modules/email/components/record-links/linked-records-field.tsx',
];

describe('modal pickers use the brand colour for what is chosen', () => {
  for (const path of PICKERS) {
    test(path, () => {
      const source = readFileSync(path, 'utf8');
      expect(source).not.toMatch(/bg-foreground[^'"]*text-background/);
      expect(source).toContain('bg-primary');
    });
  }
});
