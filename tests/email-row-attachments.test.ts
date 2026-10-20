import { describe, expect, test } from 'bun:test';

import {
  EMAIL_ROW_ATTACHMENT_TILE_LIMIT,
  selectEmailRowAttachmentTiles,
} from '../src/modules/email/lib/email-row-attachments';

const file = (name: string, overrides: Partial<{ inline: boolean; contentId: string }> = {}) => ({
  id: name,
  name,
  inline: false,
  contentId: null,
  ...overrides,
});

describe('which files a list row names', () => {
  test('names every file when there are few', () => {
    const { tiles, overflow } = selectEmailRowAttachmentTiles([
      file('Cofount proposal.pdf'),
      file('hillside.jpg'),
    ]);

    expect(tiles.map((tile) => tile.name)).toEqual(['Cofount proposal.pdf', 'hillside.jpg']);
    expect(overflow).toBe(0);
  });

  test('folds the files past the limit into a count, in attached order', () => {
    const names = ['a.pdf', 'b.pdf', 'c.pdf', 'd.pdf', 'e.pdf'];
    const { tiles, overflow } = selectEmailRowAttachmentTiles(names.map((name) => file(name)));

    expect(tiles).toHaveLength(EMAIL_ROW_ATTACHMENT_TILE_LIMIT);
    expect(tiles.map((tile) => tile.name)).toEqual(['a.pdf', 'b.pdf']);
    expect(overflow).toBe(3);
  });

  test('leaves a signature logo out, and does not count it', () => {
    // The same rule as the reading pane: only `inline === true` hides a file.
    // Outlook stamps a contentId on real attachments too (elli-ui#954).
    const { tiles, overflow } = selectEmailRowAttachmentTiles([
      file('image001.png', { inline: true, contentId: 'logo@elli' }),
      file('quote.docx', { contentId: 'ABC@KORP216.PROD.OUTLOOK.COM' }),
      file('a.pdf'),
      file('b.pdf'),
      file('c.pdf'),
    ]);

    expect(tiles.map((tile) => tile.name)).toEqual(['quote.docx', 'a.pdf']);
    expect(overflow).toBe(2);
  });

  test('a row the API sent without files draws nothing', () => {
    // An API built before the field leaves it out; the row keeps its paperclip
    // and shows no strip, rather than throwing on the missing array.
    expect(selectEmailRowAttachmentTiles(undefined)).toEqual({ tiles: [], overflow: 0 });
  });
});
