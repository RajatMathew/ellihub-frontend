import { describe, expect, test } from 'bun:test';

import {
  findDocumentAnchor,
  secureDocumentLinks,
} from '../src/modules/files/lib/file-preview-docx-links';

/** Links as `docx-preview` renders them: the document's targets, copied unchecked. */
function rendered(html: string): HTMLElement {
  const root = document.createElement('div');
  root.innerHTML = html;
  return root;
}

describe('secureDocumentLinks', () => {
  test('a javascript: link from the document can no longer be clicked', () => {
    const root = rendered(
      '<a href="javascript:alert(document.cookie)">do not click</a><a href=" JavaScript:alert(1)">nor this</a><a href="data:text/html,x">or this</a>'
    );
    secureDocumentLinks(root);
    for (const link of Array.from(root.querySelectorAll('a'))) {
      expect(link.hasAttribute('href')).toBe(false);
    }
    // The text stays, as plain text.
    expect(root.textContent).toBe('do not clicknor thisor this');
  });

  test('web links open in a new tab without a referrer; email links hand off to the mail app', () => {
    const root = rendered(
      '<a href="https://info.gilbaneco.com/x" target="_self">program</a><a href="mailto:Steven@ellicorp.com" target="_blank">mail</a>'
    );
    secureDocumentLinks(root);
    const [web, mail] = Array.from(root.querySelectorAll('a'));
    expect([web!.getAttribute('href'), web!.target, web!.rel]).toEqual([
      'https://info.gilbaneco.com/x',
      '_blank',
      'noopener noreferrer',
    ]);
    // A document-supplied target is not kept: a blank tab for mailto: is left behind empty.
    expect([mail!.getAttribute('href'), mail!.hasAttribute('target')]).toEqual([
      'mailto:Steven@ellicorp.com',
      false,
    ]);
  });

  test('an in-document link is marked for the preview to scroll, and its bookmark is found', () => {
    const root = rendered(
      '<a href="#Section%202">jump</a><p><span id="Section 2"></span>Section 2</p><a name="legacy"></a>'
    );
    secureDocumentLinks(root);
    expect(root.querySelector('a')!.dataset.docxAnchor).toBe('Section 2');
    expect(findDocumentAnchor(root, 'Section 2')?.tagName).toBe('SPAN');
    expect(findDocumentAnchor(root, 'legacy')?.tagName).toBe('A');
    expect(findDocumentAnchor(root, 'missing')).toBeNull();
  });
});
