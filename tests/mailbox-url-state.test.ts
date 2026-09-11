import { describe, expect, test } from 'bun:test';

import {
  applyMailboxUrlState,
  buildMailboxSearchString,
  DEFAULT_MAILBOX_URL_STATE,
  MAILBOX_FILTER_RESET,
  parseMailboxUrlState,
  resolveMailboxSearchSync,
  type MailboxUrlState,
} from '../src/modules/email/lib/mailbox-url-state';

function parse(search: string): MailboxUrlState {
  return parseMailboxUrlState(new URLSearchParams(search));
}

function apply(search: string, patch: Partial<MailboxUrlState>): string {
  return buildMailboxSearchString(new URLSearchParams(search), patch);
}

describe('parseMailboxUrlState', () => {
  test('an empty query string is the default view', () => {
    expect(parse('')).toEqual(DEFAULT_MAILBOX_URL_STATE);
  });

  test('reads every supported filter', () => {
    expect(
      parse('view=calendar&filter=unread&status=open_our_court&project=proj-1&q=invoice')
    ).toEqual({
      view: 'calendar',
      filter: 'unread',
      statusFilter: 'open_our_court',
      categoryTagId: null,
      projectId: 'proj-1',
      search: 'invoice',
    });
  });

  test('keeps the category tag only alongside the filter it narrows', () => {
    expect(parse('filter=other&tag=tag-1').categoryTagId).toBe('tag-1');
    expect(parse('filter=unread&tag=tag-1').categoryTagId).toBeNull();
    expect(parse('tag=tag-1').categoryTagId).toBeNull();
  });

  test('a project filter and "other" cannot both apply', () => {
    const state = parse('filter=other&tag=tag-1&project=proj-1');
    expect(state.filter).toBe('all');
    expect(state.categoryTagId).toBeNull();
    expect(state.projectId).toBe('proj-1');
  });
});

describe('parseMailboxUrlState — malformed input', () => {
  test('unknown option values fall back to their default', () => {
    expect(parse('view=spreadsheet&filter=starred&status=snoozed')).toEqual(
      DEFAULT_MAILBOX_URL_STATE
    );
  });

  test('an empty or whitespace-only value is not a value', () => {
    expect(parse('filter=&status=&view=')).toEqual(DEFAULT_MAILBOX_URL_STATE);
    expect(parse('project=%20%20&q=%20%20')).toEqual(DEFAULT_MAILBOX_URL_STATE);
  });

  test('an implausibly long id is dropped rather than forwarded to the provider', () => {
    const huge = 'x'.repeat(600);
    expect(parse(`project=${huge}`).projectId).toBeNull();
    expect(parse(`filter=other&tag=${huge}`).categoryTagId).toBeNull();
  });

  test('a repeated param takes the first value and never throws', () => {
    expect(parse('filter=unread&filter=flagged').filter).toBe('unread');
  });

  test('a search term is trimmed and capped', () => {
    expect(parse('q=%20%20quarterly%20report%20%20').search).toBe('quarterly report');
    expect(parse(`q=${'a'.repeat(400)}`).search).toHaveLength(256);
  });

  test('case matters — option values are not guessed at', () => {
    expect(parse('filter=Unread').filter).toBe('all');
  });
});

describe('applyMailboxUrlState', () => {
  test('omits defaults so a plain inbox keeps a bare URL', () => {
    expect(apply('', {})).toBe('');
    expect(apply('', { filter: 'all', statusFilter: 'all', search: '', projectId: null })).toBe('');
  });

  test('drops a param when its value returns to the default', () => {
    expect(apply('filter=unread&status=closed', { filter: 'all' })).toBe('status=closed');
    expect(apply('filter=unread&status=closed', { statusFilter: 'all' })).toBe('filter=unread');
  });

  test('writes only what differs from the default', () => {
    expect(apply('', { filter: 'flagged' })).toBe('filter=flagged');
    expect(apply('', { view: 'tasks' })).toBe('view=tasks');
    expect(apply('', { view: 'mail' })).toBe('');
  });

  test('patches merge onto the state already in the URL', () => {
    expect(apply('filter=unread', { statusFilter: 'closed' })).toBe('filter=unread&status=closed');
  });

  test('carries params this module does not own', () => {
    const result = apply('setupNickname=1&discovery=abc&filter=unread', { filter: 'flagged' });
    const params = new URLSearchParams(result);
    expect(params.get('setupNickname')).toBe('1');
    expect(params.get('discovery')).toBe('abc');
    expect(params.get('filter')).toBe('flagged');
  });

  test('selecting a project clears the "other" filter and its tag', () => {
    const params = new URLSearchParams(apply('filter=other&tag=tag-1', { projectId: 'proj-1' }));
    expect(params.get('project')).toBe('proj-1');
    expect(params.get('filter')).toBeNull();
    expect(params.get('tag')).toBeNull();
  });

  test('selecting "other" clears the project it cannot intersect', () => {
    const params = new URLSearchParams(apply('project=proj-1', { filter: 'other' }));
    expect(params.get('filter')).toBe('other');
    expect(params.get('project')).toBeNull();
  });

  test('leaving "other" drops the tag that only narrowed it', () => {
    expect(apply('filter=other&tag=tag-1', { filter: 'unread' })).toBe('filter=unread');
  });

  test('a malformed value in the URL is rewritten, not preserved', () => {
    expect(apply('filter=bogus&status=nonsense', { filter: 'flagged' })).toBe('filter=flagged');
  });

  test('the filter reset clears every filter but keeps the workspace view', () => {
    const result = apply('view=tasks&filter=unread&status=closed&project=proj-1&q=hi', {
      ...MAILBOX_FILTER_RESET,
    });
    expect(result).toBe('view=tasks');
  });

  test('does not mutate the params it was given', () => {
    const params = new URLSearchParams('filter=unread');
    applyMailboxUrlState(params, { filter: 'flagged' });
    expect(params.get('filter')).toBe('unread');
  });
});

describe('round trip', () => {
  test('every state survives encode → decode', () => {
    const states: MailboxUrlState[] = [
      DEFAULT_MAILBOX_URL_STATE,
      { ...DEFAULT_MAILBOX_URL_STATE, filter: 'unread' },
      { ...DEFAULT_MAILBOX_URL_STATE, filter: 'other', categoryTagId: 'tag-1' },
      { ...DEFAULT_MAILBOX_URL_STATE, statusFilter: 'open_their_court', search: 'q3 invoice' },
      { ...DEFAULT_MAILBOX_URL_STATE, view: 'calendar', projectId: 'AAMkAD/+9==' },
      {
        view: 'tasks',
        filter: 'attachments',
        statusFilter: 'closed',
        categoryTagId: null,
        projectId: 'proj-1',
        search: 'a & b?c=d',
      },
    ];

    for (const state of states) {
      const encoded = buildMailboxSearchString(new URLSearchParams(), state);
      expect(parseMailboxUrlState(new URLSearchParams(encoded))).toEqual(state);
    }
  });
});

describe('resolveMailboxSearchSync', () => {
  test('leaves the box alone while the URL still holds the committed term', () => {
    expect(resolveMailboxSearchSync({ committedSearch: 'h', pendingCommit: null }, 'h')).toEqual({
      next: null,
      draft: null,
    });
  });

  test('a commit that has not reached the URL yet is not an outside change', () => {
    // The render in between `setSearchSync` and the router publishing the new
    // location. Typing the old term back in here is what swallowed keystrokes.
    expect(resolveMailboxSearchSync({ committedSearch: '', pendingCommit: 'h' }, '')).toEqual({
      next: null,
      draft: null,
    });
  });

  test('the box keeps what was typed when its own commit finally lands', () => {
    // The user has typed on past 'h' by now; adopting the URL must not rewind
    // the box to it.
    expect(resolveMailboxSearchSync({ committedSearch: '', pendingCommit: 'h' }, 'h')).toEqual({
      next: { committedSearch: 'h', pendingCommit: null },
      draft: null,
    });
  });

  test('a term the box did not write is typed back into it', () => {
    expect(
      resolveMailboxSearchSync({ committedSearch: 'h', pendingCommit: null }, 'invoice')
    ).toEqual({ next: { committedSearch: 'invoice', pendingCommit: null }, draft: 'invoice' });
  });

  test('Back to an empty term clears the box', () => {
    expect(
      resolveMailboxSearchSync({ committedSearch: 'invoice', pendingCommit: null }, '')
    ).toEqual({ next: { committedSearch: '', pendingCommit: null }, draft: '' });
  });

  test('an outside change wins over a commit still in flight', () => {
    expect(resolveMailboxSearchSync({ committedSearch: 'a', pendingCommit: 'ab' }, 'zzz')).toEqual({
      next: { committedSearch: 'zzz', pendingCommit: null },
      draft: 'zzz',
    });
  });

  test('re-resolving the result changes nothing, so the render-phase adjust settles', () => {
    const first = resolveMailboxSearchSync({ committedSearch: '', pendingCommit: 'h' }, 'h');
    if (first.next === null) throw new Error('expected the URL to be adopted');
    expect(resolveMailboxSearchSync(first.next, 'h')).toEqual({ next: null, draft: null });
  });
});
