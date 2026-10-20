import {
  findBlockquote,
  isSelectionInBlockquote,
  unwrapBlockquote,
} from '@/modules/email/lib/email-blockquote';
import { describe, expect, test } from 'bun:test';

/** An editor root with the given markup, the way the composer's body arrives. */
function editor(html: string): HTMLElement {
  const root = document.createElement('div');
  root.innerHTML = html;
  return root;
}

describe('findBlockquote', () => {
  test('finds the quote a caret is sitting inside', () => {
    const root = editor('<blockquote><p>oru chaaya edukkatte</p></blockquote>');
    const text = root.querySelector('p')!.firstChild;

    expect(findBlockquote(text, root)?.tagName).toBe('BLOCKQUOTE');
  });

  test('returns null for text outside any quote', () => {
    const root = editor('<p>hi</p><blockquote><p>quoted</p></blockquote>');
    const unquoted = root.querySelector('p')!.firstChild;

    expect(findBlockquote(unquoted, root)).toBeNull();
  });

  test('never walks out past the editor root', () => {
    // The composer is itself rendered inside a quoted thread history, so a walk
    // that did not stop at the root would report the reply as quoted.
    const outer = document.createElement('blockquote');
    const root = editor('<p>hi</p>');
    outer.appendChild(root);

    expect(findBlockquote(root.querySelector('p')!.firstChild, root)).toBeNull();
  });

  test('finds the innermost quote when they nest', () => {
    const root = editor('<blockquote id="a"><blockquote id="b"><p>x</p></blockquote></blockquote>');
    const text = root.querySelector('p')!.firstChild;

    expect(findBlockquote(text, root)?.id).toBe('b');
  });
});

describe('unwrapBlockquote', () => {
  test('removes the quote and keeps the text — the bug in #929', () => {
    const root = editor('<p>hi</p><blockquote><p>oru chaaya edukkatte</p></blockquote>');
    unwrapBlockquote(root.querySelector('blockquote')!);

    expect(root.querySelector('blockquote')).toBeNull();
    expect(root.innerHTML).toBe('<p>hi</p><p>oru chaaya edukkatte</p>');
  });

  test('keeps every child, not just the first', () => {
    const root = editor('<blockquote><p>one</p><p>two</p><p>three</p></blockquote>');
    unwrapBlockquote(root.querySelector('blockquote')!);

    expect(root.innerHTML).toBe('<p>one</p><p>two</p><p>three</p>');
  });

  test('moves pasted structure through untouched rather than re-parsing it', () => {
    // The whole reason the composer edits raw HTML: a pasted table must survive
    // being quoted and unquoted.
    const table = '<table><tbody><tr><td>Qty</td><td>12</td></tr></tbody></table>';
    const root = editor(`<blockquote>${table}</blockquote>`);
    const original = root.querySelector('table');
    unwrapBlockquote(root.querySelector('blockquote')!);

    expect(root.querySelector('blockquote')).toBeNull();
    // The very same node, not a copy of it.
    expect(root.querySelector('table')).toBe(original);
    expect(root.innerHTML).toBe(table);
  });

  test('bare text comes back as its own line, not glued to the line above', () => {
    // Quoting with formatBlock replaces the block that held the line, so the
    // blockquote ends up with bare text in it. Unwrapping that straight into
    // the parent made "hi" + "oru chaaya edukkatte" render as
    // "hioru chaaya edukkatte" — the message reflowed instead of just losing
    // its quote bar (elli-ui#929).
    const root = editor('hi<blockquote>oru chaaya edukkatte</blockquote>');
    unwrapBlockquote(root.querySelector('blockquote')!);

    expect(root.querySelector('blockquote')).toBeNull();
    expect(root.innerHTML).toBe('hi<div>oru chaaya edukkatte</div>');
  });

  test('content that already has its own blocks is not double-wrapped', () => {
    const root = editor('<blockquote><p>one</p><p>two</p></blockquote>');
    unwrapBlockquote(root.querySelector('blockquote')!);

    expect(root.innerHTML).toBe('<p>one</p><p>two</p>');
  });

  test('unwraps only one level, so a nested quote stays quoted', () => {
    const root = editor('<blockquote id="a"><blockquote id="b"><p>x</p></blockquote></blockquote>');
    unwrapBlockquote(root.querySelector('#a') as HTMLElement);

    expect(root.querySelector('#a')).toBeNull();
    expect(root.querySelector('#b')).not.toBeNull();
  });

  test('leaves a caret position behind when the quote was empty', () => {
    const root = editor('<blockquote></blockquote>');
    const moved = unwrapBlockquote(root.querySelector('blockquote')!);

    expect(root.querySelector('blockquote')).toBeNull();
    expect(root.innerHTML).toBe('<br>');
    expect(moved).toHaveLength(1);
  });

  test('a detached quote is a no-op rather than a crash', () => {
    const orphan = document.createElement('blockquote');
    expect(unwrapBlockquote(orphan)).toEqual([]);
  });
});

describe('isSelectionInBlockquote', () => {
  test('false when there is no selection at all', () => {
    const root = editor('<blockquote><p>x</p></blockquote>');
    expect(isSelectionInBlockquote(null, root)).toBe(false);
  });

  test('false when the selection is in a different editor', () => {
    const root = editor('<p>hi</p>');
    const elsewhere = editor('<blockquote><p>x</p></blockquote>');
    const selection = {
      rangeCount: 1,
      anchorNode: elsewhere.querySelector('p')!.firstChild,
    } as unknown as Selection;

    expect(isSelectionInBlockquote(selection, root)).toBe(false);
  });

  test('true when the caret is inside a quote in this editor', () => {
    const root = editor('<blockquote><p>x</p></blockquote>');
    const selection = {
      rangeCount: 1,
      anchorNode: root.querySelector('p')!.firstChild,
    } as unknown as Selection;

    expect(isSelectionInBlockquote(selection, root)).toBe(true);
  });
});
