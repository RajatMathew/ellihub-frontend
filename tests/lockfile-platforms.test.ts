import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, test } from 'bun:test';

/**
 * bun.lock must carry the native binaries for every platform the app is built on.
 *
 * Packages such as rolldown, rollup, lightningcss and @tailwindcss/oxide
 * ship their compiled code as one optional dependency per platform. The lockfile
 * had been written on an Apple-silicon Mac and recorded only the darwin-arm64
 * variants, so `bun install --frozen-lockfile` — what the Dockerfile runs — installed
 * no binary on Linux or Windows, and the build failed with "Cannot find module
 * @rollup/rollup-linux-x64-gnu".
 */

type Meta = {
  os?: string | string[];
  cpu?: string | string[];
  optionalDependencies?: Record<string, string>;
};
type Entry = [id: string, registry: string, meta: Meta, integrity: string];

const text = readFileSync(join(import.meta.dir, '..', 'bun.lock'), 'utf8');
// bun.lock is JSON with trailing commas.
const lock = JSON.parse(text.replace(/,(\s*[}\]])/g, '$1')) as { packages: Record<string, Entry> };

/** Where the app is built: the Docker image, Windows and macOS workstations. */
const REQUIRED = [
  { os: 'linux', cpu: 'x64' },
  { os: 'win32', cpu: 'x64' },
  { os: 'darwin', cpu: 'arm64' },
];

const has = (value: string | string[] | undefined, wanted: string) =>
  Array.isArray(value) ? value.includes(wanted) : value === wanted;

describe('bun.lock platform binaries', () => {
  test('every package with per-platform binaries locks one for each build platform', () => {
    const missing: string[] = [];

    for (const [name, [id, , meta]] of Object.entries(lock.packages)) {
      // A platform binary names both an os and a cpu. fsevents (macOS only, no
      // cpu) and the wasm fallback (cpu "none") are not per-platform builds.
      //
      // `meta` is optional, not just its contents: a registry entry is
      // [id, "", meta, integrity], but a `file:` or git entry is [id, meta]
      // with no empty slot, so destructuring the third element gives
      // undefined. Reading through it threw and failed the whole test the
      // first time a dependency was installed from a path.
      const binaries = Object.keys(meta?.optionalDependencies ?? {})
        .map((child) => lock.packages[child]?.[2] ?? lock.packages[`${name}/${child}`]?.[2])
        .filter(
          (child): child is Meta =>
            child?.os !== undefined && child.cpu !== undefined && child.cpu !== 'none'
        );
      if (binaries.length === 0) continue;

      for (const { os, cpu } of REQUIRED) {
        if (!binaries.some((binary) => has(binary.os, os) && has(binary.cpu, cpu))) {
          missing.push(`${id}: no ${os}-${cpu} binary`);
        }
      }
    }

    expect(missing).toEqual([]);
  });

  test('finds the packages this guards', () => {
    // If the lock format changed and nothing matched, the test above would pass
    // vacuously.
    for (const name of ['rolldown', 'rollup', 'lightningcss', '@tailwindcss/oxide']) {
      expect(
        Object.keys(lock.packages[name]?.[2].optionalDependencies ?? {}).length
      ).toBeGreaterThan(1);
    }
  });
});
