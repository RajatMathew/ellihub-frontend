import { createElement } from 'react';

import { describe, expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';

import { MessageResponse } from '../src/mock/ai-elements/message';

const render = (text: string, isStreaming = false) =>
  renderToStaticMarkup(createElement(MessageResponse, { isStreaming }, text));

describe('how an Elliot reply renders', () => {
  test('a quoted <img> from a mail never becomes a live remote load', () => {
    const html = render('Quoted: <img src="https://tracker.example/p.gif"> done');
    expect(html).not.toContain('tracker.example');
    expect(html).not.toContain('<img');
  });

  test('a markdown image is not rendered either', () => {
    expect(render('![logo](https://cdn.example/logo.png)')).not.toContain('cdn.example');
  });

  test('nothing in a reply can fetch from a remote server', () => {
    const html = render(
      'a <picture><source srcset="https://x.example/s.jpg"></picture> ' +
        '<video src="https://x.example/v.mp4" poster="https://x.example/p.jpg"></video> ' +
        '<audio src="https://x.example/a.mp3"></audio> <iframe src="https://x.example/f"></iframe>'
    );
    expect(html).not.toContain('x.example');
  });

  test('scripts and javascript: links are blocked', () => {
    const html = render('<script>alert(1)</script>\n\nSee [x](javascript:alert(1)).');
    expect(html).not.toContain('<script');
    expect(html).not.toMatch(/href="javascript:/);
    expect(html).toContain('[blocked]');
  });

  test('half-written bold mid-stream renders as bold, not raw asterisks', () => {
    const html = render('Here is **half bol', true);
    expect(html).not.toContain('**');
    expect(html).toContain('data-streamdown="strong"');
  });

  test('a finished reply does not animate', () => {
    expect(render('**Summary**\n\n- one', false)).not.toContain('data-sd-animate');
    expect(render('Still typing', true)).toContain('data-sd-animate');
  });
});
