import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, test } from 'bun:test';

/**
 * The build toolchain versions a production build depends on, as bun.lock
 * resolves them.
 *
 * With Vite 8, vite-plugin-pwa 1.3's workbox-build bundles the service worker
 * with Rollup 4 — a native module — in the same process as Vite's own Rolldown.
 * On Rollup 4.56.0 about four builds in ten exited silently in that step, with
 * status 116 or 127 and no service worker written; on 4.63.4, 14 builds in a
 * row succeeded. The failure is intermittent, so a build passing once proves
 * nothing, and this pins the resolved version instead.
 */
const lock = readFileSync(join(import.meta.dir, '..', 'bun.lock'), 'utf8');

function resolved(name: string): string {
  const entry = new RegExp(`^    "${name.replace(/[/@]/g, '\\$&')}": \\["${name}@([^"]+)"`, 'm');
  const version = entry.exec(lock)?.[1];
  if (!version) throw new Error(`${name} is not in bun.lock`);
  return version;
}

const atLeast = (version: string, floor: string) => Bun.semver.order(version, floor) >= 0;

describe('build toolchain', () => {
  test('rollup is at least 4.63.4, which no longer crashes the service worker build', () => {
    const version = resolved('rollup');

    expect(atLeast(version, '4.63.4')).toBe(true);
  });

  test('the workbox build that uses it is the one this was measured with', () => {
    // If workbox-build moves off Rollup 4 or to another major, the floor above
    // needs re-measuring rather than silently passing.
    expect(resolved('workbox-build').startsWith('7.')).toBe(true);
  });
});
