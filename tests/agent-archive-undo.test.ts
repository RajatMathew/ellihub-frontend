import { describe, expect, test } from 'bun:test';

import { archiveToastCopy, archiveUndoSteps } from '../src/mock/agent-archive-undo';
import {
  archiveTakesOpenEmail,
  getLeavingEmailRows,
  isEmailRowLeaving,
  markEmailRowsLeaving,
  subscribeLeavingEmailRows,
  waitForEmailRowLeave,
} from '../src/modules/email/lib/email-row-leaving';

const FOLDERS = { inboxId: 'inbox', archiveId: 'archive' };

describe('archiveUndoSteps', () => {
  test('unarchives mail that came from the Inbox', () => {
    expect(archiveUndoSteps(['m1'], new Map([['m1', 'inbox']]), FOLDERS)).toEqual([
      { messageId: 'm1', kind: 'unarchive' },
    ]);
  });

  test('moves mail filed in another folder back there, not to the Inbox', () => {
    expect(archiveUndoSteps(['m1'], new Map([['m1', 'projects']]), FOLDERS)).toEqual([
      { messageId: 'm1', kind: 'move', folderId: 'projects' },
    ]);
  });

  test('falls back to unarchive when no loaded page knew the folder', () => {
    expect(archiveUndoSteps(['m1', 'm2'], new Map([['m1', null]]), FOLDERS)).toEqual([
      { messageId: 'm1', kind: 'unarchive' },
      { messageId: 'm2', kind: 'unarchive' },
    ]);
  });

  test('does not "move back" into Archive mail that was already archived', () => {
    expect(archiveUndoSteps(['m1'], new Map([['m1', 'archive']]), FOLDERS)).toEqual([
      { messageId: 'm1', kind: 'unarchive' },
    ]);
  });

  test('plans each message of a bulk archive on its own', () => {
    const sources = new Map([
      ['m1', 'inbox'],
      ['m2', 'vendors'],
    ]);
    expect(archiveUndoSteps(['m1', 'm2'], sources, FOLDERS)).toEqual([
      { messageId: 'm1', kind: 'unarchive' },
      { messageId: 'm2', kind: 'move', folderId: 'vendors' },
    ]);
  });
});

describe('archiveToastCopy', () => {
  test('names the email when there is one', () => {
    expect(archiveToastCopy(1, '  Quote for level 3  ')).toEqual({
      title: 'Email archived',
      description: 'Quote for level 3',
      reversed: 'Email moved back.',
    });
  });

  test('a blank subject leaves no empty description line', () => {
    expect(archiveToastCopy(1, '   ').description).toBeNull();
  });

  test('counts a bulk archive instead of naming one email', () => {
    expect(archiveToastCopy(3, 'First of three')).toEqual({
      title: '3 emails archived',
      description: null,
      reversed: '3 emails moved back.',
    });
  });
});

describe('leaving email rows', () => {
  test('matches a row by its own id or its latest message', () => {
    const leaving = new Set(['m2']);
    expect(isEmailRowLeaving({ id: 'm2' }, leaving)).toBe(true);
    expect(isEmailRowLeaving({ id: 'm1', latestMessageId: 'm2' }, leaving)).toBe(true);
    expect(isEmailRowLeaving({ id: 'm1', latestMessageId: 'm3' }, leaving)).toBe(false);
  });

  test('the release brings the rows back, and only that mark’s rows', () => {
    const releaseFirst = markEmailRowsLeaving(['a']);
    const releaseSecond = markEmailRowsLeaving(['b']);
    expect([...getLeavingEmailRows()].sort()).toEqual(['a', 'b']);
    releaseFirst();
    expect([...getLeavingEmailRows()]).toEqual(['b']);
    releaseSecond();
    expect(getLeavingEmailRows().size).toBe(0);
  });

  test('releasing twice is harmless and notifies once', () => {
    let notified = 0;
    const unsubscribe = subscribeLeavingEmailRows(() => notified++);
    const release = markEmailRowsLeaving(['a']);
    release();
    release();
    unsubscribe();
    expect(notified).toBe(2);
    expect(getLeavingEmailRows().size).toBe(0);
  });

  test('a new set on every change, so React sees it change', () => {
    const before = getLeavingEmailRows();
    const release = markEmailRowsLeaving(['a']);
    expect(getLeavingEmailRows()).not.toBe(before);
    release();
  });

  test('no wait for the fade when motion is reduced', async () => {
    let done = false;
    void waitForEmailRowLeave(true).then(() => (done = true));
    await Promise.resolve();
    expect(done).toBe(true);
  });
});

describe('archiveTakesOpenEmail', () => {
  test('nothing open, nothing to let go of', () => {
    expect(archiveTakesOpenEmail(null, ['m1'])).toBe(false);
  });

  test('the open row itself, or its latest message', () => {
    expect(archiveTakesOpenEmail({ id: 'm1' }, ['m1'])).toBe(true);
    expect(archiveTakesOpenEmail({ id: 'c1', latestMessageId: 'm2' }, ['m2'])).toBe(true);
  });

  test('an older message of the open thread still takes it', () => {
    const open = { id: 'c1', latestMessageId: 'm3', threadMessages: [{ id: 'm1' }, { id: 'm3' }] };
    expect(archiveTakesOpenEmail(open, ['m1'])).toBe(true);
  });

  test('archiving other mail leaves the open conversation alone', () => {
    expect(archiveTakesOpenEmail({ id: 'm1', latestMessageId: 'm1' }, ['m9'])).toBe(false);
  });
});
