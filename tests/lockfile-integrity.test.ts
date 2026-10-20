import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, test } from 'bun:test';

/**
 * Every registry package in bun.lock carries an integrity hash.
 *
 * `bun install --frozen-lockfile` — what the Dockerfile and Vercel run — checks
 * each downloaded tarball against the hash the lockfile records, and fails the
 * install on a mismatch. An entry whose hash is empty is installed unchecked,
 * and several hundred were, a leftover of how the lockfile was first generated.
 * They were filled from the registry's published `dist.integrity` for the exact
 * locked version.
 */
type Entry = [id: string, registry: string, meta: object, integrity: string];

const text = readFileSync(join(import.meta.dir, '..', 'bun.lock'), 'utf8');
// bun.lock is JSON with trailing commas.
const lock = JSON.parse(text.replace(/,(\s*[}\]])/g, '$1')) as {
  packages: Record<string, unknown[]>;
};

/** Registry packages: `[id, registry, meta, integrity]`, `registry` "" for npm. */
const registryEntries = Object.values(lock.packages).filter(
  (entry): entry is Entry => entry.length === 4 && typeof entry[1] === 'string'
);

describe('bun.lock integrity', () => {
  test('every registry package records a sha512 integrity hash', () => {
    const unchecked = registryEntries
      .filter(([, , , integrity]) => !/^sha512-[A-Za-z0-9+/]{86}==$/.test(integrity))
      .map(([id]) => id);

    expect(unchecked).toEqual([]);
  });

  test('finds the registry packages', () => {
    // If the lock format changed and nothing matched, the test above would pass
    // vacuously.
    expect(registryEntries.length).toBeGreaterThan(500);
  });
});
