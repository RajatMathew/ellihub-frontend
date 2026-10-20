import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, test } from 'bun:test';

/**
 * The reply composer no longer says where a reply lands (elli-ui#1373).
 *
 * Both reply surfaces — the inline card and the expanded editor — carried a
 * hint beside Send, "Your reply lands at the top of the thread" and "Lands at
 * the top of the thread". It was removed from everywhere. Copy is wiring, not
 * logic, and the unit suite has no renderer, so this reads the source the way
 * `email-delete-confirmation.test.ts` does: no file under `src/` may say it.
 */

const SRC = path.join(import.meta.dir, '..', 'src');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.(ts|tsx)$/.test(entry.name) ? [full] : [];
  });
}

describe('the reply composer says nothing about where a reply lands', () => {
  test('no source file carries the "lands at the top of the thread" hint', () => {
    const offenders = sourceFiles(SRC).filter((file) =>
      /lands at the top of the thread/i.test(readFileSync(file, 'utf8'))
    );

    expect(offenders.map((file) => path.relative(SRC, file))).toEqual([]);
  });
});
