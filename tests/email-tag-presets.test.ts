import { describe, expect, test } from 'bun:test';

import type { ConnectedEmailTag } from '../src/modules/email/api';
import {
  canCreateTag,
  carriesAnyTag,
  filterTagsFor,
  isOtherSidePreset,
  matchTagOptions,
  PROJECT_PRESET_TAGS,
  tagPickerOptions,
} from '../src/modules/email/lib/email-tag-presets';

/** elli-ui#1420: tags for project mail, and filtering any list by them. */

const tag = (id: string, name: string, source: 'custom' | 'provider' = 'custom') =>
  ({ id, name, source }) as unknown as ConnectedEmailTag;

describe('the presets each side offers', () => {
  test('project mail is offered the project presets', () => {
    expect(PROJECT_PRESET_TAGS).toEqual(
      expect.arrayContaining(['Compliance', 'RFQ Negotiation', 'Vendor Payment'])
    );
  });

  test('a preset of one side is foreign to the other, ignoring case', () => {
    expect(isOtherSidePreset('spam', 'project')).toBe(true);
    expect(isOtherSidePreset('compliance', 'other')).toBe(true);
    expect(isOtherSidePreset('Compliance', 'project')).toBe(false);
    expect(isOtherSidePreset('Warranty', 'project')).toBe(false);
  });
});

describe('the tags a filter menu lists', () => {
  const tags = [
    tag('1', 'Warranty'),
    tag('2', 'Vendor Payment'),
    tag('3', 'Spam'),
    tag('4', 'Compliance'),
    tag('5', 'Important', 'provider'),
    tag('6', 'aardvark'),
  ];

  test('project side: its presets first in set order, then the rest A–Z, no Other presets', () => {
    expect(filterTagsFor(tags, 'project').map((t) => t.name)).toEqual([
      'Compliance',
      'Vendor Payment',
      'aardvark',
      'Warranty',
    ]);
  });

  test('other side: Other presets first, no project presets', () => {
    expect(filterTagsFor(tags, 'other').map((t) => t.name)).toEqual([
      'Spam',
      'aardvark',
      'Warranty',
    ]);
  });

  test('provider categories are never offered', () => {
    expect(filterTagsFor(tags, 'project').some((t) => t.name === 'Important')).toBe(false);
  });
});

describe('a row carrying a chosen tag', () => {
  test('matches any chosen tag, ignoring case', () => {
    expect(carriesAnyTag(['vendor payment'], ['Compliance', 'Vendor Payment'])).toBe(true);
    expect(carriesAnyTag(['Spam'], ['Compliance'])).toBe(false);
    expect(carriesAnyTag(undefined, ['Compliance'])).toBe(false);
  });

  test('no chosen tag lets every row through', () => {
    expect(carriesAnyTag([], [])).toBe(true);
  });
});

describe('the tag picker (elli-ui#1470)', () => {
  const made = [
    tag('a', 'Compliance'),
    tag('b', 'Warranty'),
    tag('c', 'Spam'),
    tag('d', 'Lien Waivers'),
  ];

  test('lists this side’s presets first, made or not, then made tags A–Z marked custom', () => {
    const options = tagPickerOptions('project', made, []);
    expect(options.map((o) => [o.name, Boolean(o.tag), o.custom])).toEqual([
      ['Compliance', true, false],
      ['RFQ Negotiation', false, false],
      ['Vendor Payment', false, false],
      ['Submittals', false, false],
      ['Scheduling', false, false],
      ['Miscellaneous', false, false],
      ['Lien Waivers', true, true],
      ['Warranty', true, true],
    ]);
  });

  test('keeps the other side’s preset out unless this thread carries it', () => {
    expect(tagPickerOptions('project', made, []).some((o) => o.name === 'Spam')).toBe(false);
    expect(tagPickerOptions('project', made, ['spam']).some((o) => o.name === 'Spam')).toBe(true);
  });

  test('search matches part of a name, ignoring case', () => {
    const options = tagPickerOptions('project', made, []);
    expect(matchTagOptions(options, 'ar').map((o) => o.name)).toEqual(['Warranty']);
    expect(matchTagOptions(options, '  ')).toHaveLength(options.length);
  });

  test('offers to create only a name no tag has', () => {
    const options = tagPickerOptions('project', made, []);
    expect(canCreateTag(options, 'Punch List')).toBe(true);
    expect(canCreateTag(options, 'warranty')).toBe(false);
    expect(canCreateTag(options, '  rfq   negotiation ')).toBe(false);
    expect(canCreateTag(options, '   ')).toBe(false);
  });
});
