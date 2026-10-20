import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, test } from 'bun:test';

/**
 * Every build installs from bun.lock and nothing else.
 *
 * package-lock.json used to be committed next to it and had drifted 55 versions
 * away. Vercel picks a package manager from the lockfiles it finds and does not
 * document which wins when there are two, so a deploy could have installed a tree
 * nothing had been tested against.
 */
const ROOT = join(import.meta.dir, '..');

describe('package manager', () => {
  test('bun.lock is the only committed lockfile', () => {
    const tracked = execFileSync('git', ['ls-files', '--', '*lock*'], {
      cwd: ROOT,
      encoding: 'utf8',
    })
      .split('\n')
      .filter((path) =>
        /(^|\/)(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|bun\.lockb?)$/.test(path)
      );

    expect(tracked).toEqual(['bun.lock']);
  });

  test('Vercel installs from bun.lock without re-resolving', () => {
    const vercel = JSON.parse(readFileSync(join(ROOT, 'vercel.json'), 'utf8')) as {
      installCommand?: string;
    };

    expect(vercel.installCommand).toBe('bun install --frozen-lockfile');
  });
});
