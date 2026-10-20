import { describe, expect, test } from 'bun:test';

import { EMAIL_LINK_CSS } from '../src/modules/email/lib/email-body-transforms';

describe('EMAIL_LINK_CSS', () => {
  test("styles links, not Outlook's signature bookmark", () => {
    document.body.innerHTML = `<style>${EMAIL_LINK_CSS}</style>
      <a id="sig" name="_MailAutoSig">Regards,</a>
      <a id="link" href="https://example.com">example.com</a>`;
    const style = document.querySelector('style')!.sheet!;
    const selectors = [...style.cssRules].map((rule) => (rule as CSSStyleRule).selectorText);
    const sig = document.getElementById('sig')!;
    const link = document.getElementById('link')!;

    expect(selectors.some((selector) => sig.matches(selector))).toBe(false);
    expect(selectors.some((selector) => link.matches(selector))).toBe(true);
  });
});
