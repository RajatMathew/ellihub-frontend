import { describe, expect, test } from 'bun:test';

import {
  buildEmailFrameDocument,
  EMAIL_QUOTE_TOGGLE_ATTRIBUTE,
} from '../src/modules/email/lib/email-html-document';

/**
 * The frame stylesheet is not reachable through the app's theme — the message
 * renders in a sandboxed document with its own CSS, so nothing in
 * `src/app/styles/` constrains it and no lint rule notices when it drifts away
 * from the rest of the UI. These assertions stand in for that.
 */

function stylesheet(): string {
  const doc = buildEmailFrameDocument({ bodyHtml: '<p>Body</p>' });
  return doc.match(/<style>([\s\S]*?)<\/style>/)?.[1] ?? '';
}

/** The declarations of the first rule whose selector matches `selector`. */
function rule(selector: string): string {
  const css = stylesheet();
  const start = css.indexOf(selector);
  if (start === -1) return '';
  const open = css.indexOf('{', start);
  const close = css.indexOf('}', open);
  return css.slice(open + 1, close);
}

describe('quoted-content toggle styling', () => {
  const toggle = `[${EMAIL_QUOTE_TOGGLE_ATTRIBUTE}]`;

  test('is an outlined pill, not a filled chip', () => {
    const declarations = rule(`${toggle} {`);

    // A solid grey fill gave the control more weight than the message text it
    // sits under, and matched nothing else in the app.
    expect(declarations).toContain('background: transparent');
    expect(declarations).toMatch(/border:\s*1px solid/);
    expect(declarations).toContain('border-radius: 999px');
  });

  test('borrows the border colour of the quoted block it opens', () => {
    const declarations = rule(`${toggle} {`);
    const quoted = rule(`[data-elli-quoted-content] {`);

    const border = declarations.match(/border:\s*1px solid (#[0-9a-f]{3,8})/i)?.[1];
    expect(border).toBeTruthy();
    expect(quoted.toLowerCase()).toContain(border!.toLowerCase());
  });

  test('the dots stay small enough to read as an ellipsis', () => {
    const declarations = rule('[data-elli-quote-dot] {');

    expect(declarations).toContain('width: 3px');
    expect(declarations).toContain('height: 3px');
  });

  test('hover is the only thing that raises its contrast', () => {
    const resting = rule(`${toggle} {`);
    const hover = rule(`${toggle}:hover {`);

    expect(resting).toContain('color: #a1a1aa');
    expect(hover).toContain('color: #52525b');
    expect(hover).toMatch(/background:\s*#fafafa/);
  });

  test('keeps a visible focus ring, which is the only way to reach it by keyboard', () => {
    expect(rule(`${toggle}:focus-visible {`)).toMatch(/outline:\s*2px solid/);
  });

  test('does not animate for a reader who asked it not to', () => {
    const css = stylesheet();

    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
    expect(css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'))).toContain(
      'transition: none'
    );
  });
});
