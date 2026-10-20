import { describe, expect, test } from 'bun:test';

import {
  buildEmailFrameDocument,
  EMAIL_CONTENT_ATTRIBUTE,
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

  test('is a filled chip, so it is not mistaken for the sender’s own rule', () => {
    const declarations = rule(`${toggle} {`);

    // It used to be a hairline outline, which on white is the same weight as a
    // table border a sender drew — so it read as part of the message and went
    // unnoticed (elli-ui#993). A painted pill is unambiguously the app's.
    expect(declarations).not.toContain('background: transparent');
    expect(declarations).toMatch(/background:\s*#[0-9a-f]{3,8}/i);
    expect(declarations).toContain('border-radius: 999px');
  });

  test('carries no border that would compete with its fill', () => {
    const declarations = rule(`${toggle} {`);

    expect(declarations).not.toMatch(/border:\s*1px solid/);
  });

  test('is filled with the same grey as its React twin, not the quote rule', () => {
    const declarations = rule(`${toggle} {`);
    const quoted = rule(`[data-elli-quoted-content] {`);

    const background = declarations.match(/background:\s*(#[0-9a-f]{3,8})/i)?.[1];

    // `--muted` in `styles/themes/light.css`, which is what the plain-text
    // twin in `email-message-body.tsx` paints itself with via `bg-muted`.
    expect(background?.toLowerCase()).toBe('#f4f4f5');

    // And distinctly not the hairline the quoted block below it is ruled with,
    // which is the colour it used to borrow.
    expect(quoted.toLowerCase()).not.toContain('#f4f4f5');
  });

  test('the dots stay small enough to read as an ellipsis', () => {
    const declarations = rule('[data-elli-quote-dot] {');

    expect(declarations).toContain('width: 3px');
    expect(declarations).toContain('height: 3px');
  });

  test('hover is the only thing that raises its contrast', () => {
    const resting = rule(`${toggle} {`);
    const hover = rule(`${toggle}:hover {`);

    expect(resting).toContain('color: #71717a');
    expect(hover).toContain('color: #3f3f46');
    expect(hover).toMatch(/background:\s*#e4e4e7/);
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

describe('message wrapper', () => {
  test('wraps the message, and only the message, in the element that gets scaled', () => {
    const doc = buildEmailFrameDocument({ bodyHtml: '<p>Body</p>' });

    // The script sits outside it: it is not content, and the body — which the
    // height is measured on — has to stay unscaled.
    expect(doc).toContain(`<body><div ${EMAIL_CONTENT_ATTRIBUTE}><p>Body</p></div><script>`);
  });

  test('contains its children’s margins, so they are scaled with it', () => {
    expect(rule(`[${EMAIL_CONTENT_ATTRIBUTE}] {`)).toContain('display: flow-root');
  });
});
