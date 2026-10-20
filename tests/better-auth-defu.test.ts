import { dirname } from 'node:path';

import { describe, expect, test } from 'bun:test';

/**
 * GHSA-737v-mqg7-c878: defu <= 6.1.4 copied its defaults with Object.assign, which
 * invokes the __proto__ setter, so an own __proto__ key in parsed JSON overrode
 * the defaults it was merged with.
 *
 * The app never imports defu; Better Auth's client does, to merge plugin actions,
 * so it ships in the bundle. Better Auth accepts ^6.1.4, which let the lockfile
 * sit on the vulnerable release. This resolves defu from Better Auth's own
 * location — the copy the app actually loads — rather than whatever is hoisted.
 */
const betterAuth = Bun.resolveSync('better-auth', import.meta.dir);
const { defu } = (await import(Bun.resolveSync('defu', dirname(betterAuth)))) as {
  defu: <T, D>(object: T, defaults: D) => T & D;
};

describe('the defu Better Auth loads', () => {
  test('keeps a default that a parsed __proto__ key tries to override', () => {
    const input = JSON.parse('{"__proto__": {"isAdmin": true}}') as object;

    const merged = defu(input, { isAdmin: false });

    expect(merged.isAdmin).toBe(false);
  });
});
