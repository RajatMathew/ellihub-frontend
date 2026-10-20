import { describe, expect, test } from 'bun:test';

import { EMAIL_SIGNATURE_CLASS } from '../src/modules/email/lib/email-html-policy';
import {
  filterTemplates,
  insertEmailTemplate,
  templatePreview,
} from '../src/modules/email/lib/email-templates';

// Email templates (elli-ui#668): a click drops one into the composer's body,
// above the signature, without disturbing what is already there.

const signature = `<div class="${EMAIL_SIGNATURE_CLASS}"><p>Thanks,<br>Dana</p></div>`;
const template = '<p>Hi,</p><p>Just following up on my last email.</p>';

describe('using a template', () => {
  test('fills an empty message, above the signature', () => {
    const body = insertEmailTemplate(`<div><br></div>${signature}`, template);

    expect(body.indexOf('Just following up')).toBeLessThan(body.indexOf('Thanks,'));
    expect(body.match(new RegExp(EMAIL_SIGNATURE_CLASS, 'g'))).toHaveLength(1);
    expect(body.startsWith('<p>Hi,</p>')).toBe(true);
  });

  test('follows what is already typed, still above the signature', () => {
    const body = insertEmailTemplate(`<p>Quick one.</p>${signature}`, template);

    const typed = body.indexOf('Quick one.');
    const inserted = body.indexOf('Just following up');
    expect(typed).toBeLessThan(inserted);
    expect(inserted).toBeLessThan(body.indexOf('Thanks,'));
  });

  test('works where the mailbox has no signature', () => {
    expect(insertEmailTemplate('', template)).toBe(template);
    expect(insertEmailTemplate('<p>Typed</p>', template)).toBe(`<p>Typed</p>${template}`);
  });

  test('never carries a script into the editor', () => {
    const body = insertEmailTemplate('', '<p>Hello</p><script>alert(1)</script>');

    expect(body).not.toContain('script');
    expect(body).toContain('Hello');
  });
});

describe('the template list', () => {
  const templates = [
    { id: '1', name: 'Request a quote', subject: null, body: '<p>Please include lead times.</p>' },
    { id: '2', name: 'Follow up', subject: null, body: '<p>Any update on delivery?</p>' },
  ];

  test('previews a template as one line of plain text', () => {
    expect(templatePreview('<p>Hi,</p><p>Any   update?</p>')).toBe('Hi, Any update?');
    expect(templatePreview('<div>Line one<br>line two</div>')).toBe('Line one line two');
    expect(templatePreview(`<p>${'word '.repeat(40)}</p>`, 20)).toHaveLength(20);
  });

  test('finds a template by its name or its words', () => {
    expect(filterTemplates(templates, 'quote').map((item) => item.id)).toEqual(['1']);
    expect(filterTemplates(templates, 'delivery').map((item) => item.id)).toEqual(['2']);
    expect(filterTemplates(templates, '  ')).toHaveLength(2);
  });
});
