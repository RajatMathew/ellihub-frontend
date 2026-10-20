import { describe, expect, test } from 'bun:test';

import { MutationObserver, QueryClient } from '@tanstack/react-query';

import {
  applyEmailTagDelta,
  invertEmailTagDelta,
} from '../src/modules/email/lib/email-message-tags';

describe('message tag delta', () => {
  test('a failed edit reverts only itself, not the clicks queued after it', () => {
    // Spam, then Newsletter, then Personal, all clicked before any answer.
    const spam = { addNames: ['Spam'] };
    let tags = applyEmailTagDelta([], spam);
    tags = applyEmailTagDelta(tags, { addNames: ['Newsletter'] });
    tags = applyEmailTagDelta(tags, { addNames: ['Personal'] });

    // Spam's request fails. Restoring the cache Spam saw would give [].
    expect(applyEmailTagDelta(tags, invertEmailTagDelta(spam))).toEqual(['Newsletter', 'Personal']);
  });

  test('reverting a removal puts the tag back', () => {
    const edit = { removeNames: ['newsletter'] };
    const tags = applyEmailTagDelta(['Newsletter', 'Spam'], edit);
    expect(tags).toEqual(['Spam']);
    expect(applyEmailTagDelta(tags, invertEmailTagDelta(edit))).toEqual(['Spam', 'newsletter']);
  });

  test('matches names case-insensitively and never duplicates', () => {
    expect(applyEmailTagDelta(['Spam'], { addNames: ['spam'] })).toEqual(['spam']);
    expect(applyEmailTagDelta(['Spam'], { addNames: ['Spam'], removeNames: ['SPAM'] })).toEqual([]);
  });
});

describe('scoped tag mutations', () => {
  /**
   * elli-core's tag PATCH reads the message's tags and writes the whole set
   * back, so two in flight together lose one. The fix leans on a shared
   * mutation scope sending them one at a time while `onMutate` — the chip
   * filling in — still runs at click time. Pin both halves.
   */
  test('requests run one at a time but every optimistic pass runs immediately', async () => {
    const client = new QueryClient();
    const events: string[] = [];
    const releases: Array<() => void> = [];

    const observe = () =>
      new MutationObserver<void, Error, string>(client, {
        scope: { id: 'email-message-tags' },
        onMutate: (name) => {
          events.push(`optimistic:${name}`);
        },
        mutationFn: (name) =>
          new Promise<void>((resolve) => {
            events.push(`request:${name}`);
            releases.push(resolve);
          }),
      });

    const first = observe().mutate('Spam');
    const second = observe().mutate('Newsletter');
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(events).toEqual(['optimistic:Spam', 'optimistic:Newsletter', 'request:Spam']);

    releases[0]();
    await first;
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(events.at(-1)).toBe('request:Newsletter');

    releases[1]();
    await second;
  });
});
