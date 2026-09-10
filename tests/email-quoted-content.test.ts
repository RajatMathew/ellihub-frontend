import { describe, expect, test } from 'bun:test';

import {
  markQuotedEmailContent,
  QUOTE_TOGGLE_ATTRIBUTE,
  QUOTED_CONTENT_ATTRIBUTE,
  splitQuotedPlainText,
} from '../src/modules/email/lib/email-quoted-content';

function parse(html: string) {
  return new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
}

/** What the reader sees before touching the toggle. */
function visibleText(doc: Document) {
  const clone = doc.body.cloneNode(true) as HTMLElement;
  clone.querySelector(`[${QUOTED_CONTENT_ATTRIBUTE}]`)?.remove();
  return clone.textContent?.replace(/\s+/g, ' ').trim() ?? '';
}

function quotedText(doc: Document) {
  const container = doc.body.querySelector(`[${QUOTED_CONTENT_ATTRIBUTE}]`);
  return container?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
}

describe('quoted content — Outlook, the markup our corpus is made of', () => {
  test('collapses everything after a reply header, divider included', () => {
    const doc = parse(`
      <div>Approved, please proceed with the shop drawings.</div>
      <div id="appendonsend"></div>
      <hr style="display:inline-block;width:98%" tabindex="-1">
      <div id="divRplyFwdMsg" dir="ltr">
        <font face="Calibri"><b>From:</b> Procurement<br><b>Sent:</b> 03 September 2026<br>
        <b>To:</b> ap@ellicorp.com<br><b>Subject:</b> RFQ 28100-25</font>
      </div>
      <div>Please review the attached quote and confirm by Friday.</div>
    `);

    markQuotedEmailContent(doc);
    expect(visibleText(doc)).toBe('Approved, please proceed with the shop drawings.');
    expect(quotedText(doc)).toContain('Please review the attached quote');
    expect(doc.body.querySelector(`[${QUOTED_CONTENT_ATTRIBUTE}] hr`)).not.toBeNull();
  });

  /**
   * The elli-ui#788 regression, reduced from corpus body 3WThWYN6. A quoted
   * fragment appears above the sender's signature; the boundary must be the
   * reply header below it, not the earlier fragment.
   */
  test('never hides the sender signature, even with a quote fragment above it', () => {
    const doc = parse(`
      <div class="WordSection1">
        <p class="MsoNormal">Thanks — see below.</p>
        <div style="border:none;border-top:solid #E1E1E1 1.0pt;padding:3.0pt 0in 0in 0in">
          <p><b>From:</b> A<br><b>Sent:</b> Monday<br><b>Subject:</b> Older fragment</p>
        </div>
        <div id="Signature"><p>Rajat Mathew</p><p>Elli NY Design Corp</p></div>
        <div id="divRplyFwdMsg"><b>From:</b> B<br><b>Sent:</b> Tuesday<br><b>Subject:</b> Real</div>
        <div>The actual quoted original message body.</div>
      </div>
    `);

    markQuotedEmailContent(doc);
    expect(visibleText(doc)).toContain('Thanks — see below.');
    expect(visibleText(doc)).toContain('Rajat Mathew');
    expect(visibleText(doc)).toContain('Elli NY Design Corp');
    expect(quotedText(doc)).toContain('The actual quoted original message body.');
  });

  test('takes the outermost boundary when Outlook nests x_ prefixed rounds', () => {
    const doc = parse(`
      <div class="WordSection1">
        <p>Latest reply.</p>
        <div id="divRplyFwdMsg"><b>From:</b> A<br><b>Sent:</b> Mon<br><b>Subject:</b> S1</div>
        <div>
          <p>Round two.</p>
          <div id="x_divRplyFwdMsg"><b>From:</b> B<br><b>Sent:</b> Sun<br><b>Subject:</b> S2</div>
          <div>
            <p>Round three.</p>
            <div id="x_x_divRplyFwdMsg"><b>From:</b> C<br><b>Sent:</b> Sat<br><b>Subject:</b> S3</div>
          </div>
        </div>
      </div>
    `);

    markQuotedEmailContent(doc);
    expect(visibleText(doc)).toBe('Latest reply.');
    expect(quotedText(doc)).toContain('Round two.');
    expect(quotedText(doc)).toContain('Round three.');
    expect(doc.body.querySelectorAll(`[${QUOTE_TOGGLE_ATTRIBUTE}]`)).toHaveLength(1);
  });

  test('collapses an Outlook divider block with no wrapper id', () => {
    const doc = parse(`
      <p>See below.</p>
      <div style="border:none;border-top:solid #B5C4DF 1.0pt;padding:3.0pt 0cm 0cm 0cm">
        <p><b>From:</b> Someone<br><b>Sent:</b> Monday<br><b>Subject:</b> Quote request</p>
      </div>
      <p>The original body text.</p>
    `);

    markQuotedEmailContent(doc);
    expect(visibleText(doc)).toBe('See below.');
    expect(quotedText(doc)).toContain('The original body text.');
  });

  test('collapses after an "Original Message" separator', () => {
    const doc = parse(`
      <div>Confirmed.</div>
      <div>-----Original Message-----</div>
      <div>Please confirm the delivery date.</div>
    `);

    markQuotedEmailContent(doc);
    expect(visibleText(doc)).toBe('Confirmed.');
    expect(quotedText(doc)).toContain('Please confirm the delivery date.');
  });

  test('does not mistake an ancestor for the reply header block', () => {
    // The whole message wrapped in one div, header labels deep inside it. A
    // length-unbounded header match would classify the wrapper as the quote and
    // hide the entire body.
    const doc = parse(`
      <div class="WordSection1">
        <p>Here is the full scope narrative for the bid, which runs long enough
           that no reasonable reply header could be confused with it.</p>
        <p>Second paragraph of the sender's own writing, also substantial.</p>
        <div id="divRplyFwdMsg"><b>From:</b> X<br><b>Sent:</b> Y<br><b>Subject:</b> Z</div>
        <div>quoted original</div>
      </div>
    `);

    markQuotedEmailContent(doc);
    expect(visibleText(doc)).toContain('full scope narrative');
    expect(visibleText(doc)).toContain('Second paragraph');
    expect(quotedText(doc)).toContain('quoted original');
  });

  /**
   * Reduced from corpus body zzdzAqfp. The whole message sits in one wrapper
   * that also holds the signature; classifying that wrapper as a signature
   * meant the quote inside it was never looked for and nothing collapsed.
   */
  test('finds the quote inside a wrapper that also holds the signature', () => {
    const doc = parse(`
      <div>
        <p>Hi Elli,</p>
        <p>Attached is the certificate for E.W. Howell Co., as requested.</p>
        <p>Thanks and regards,</p>
        <div class="gmail_signature">Processing Team, 135 Crossways Park Drive</div>
        <div><b>From:</b> Requisitions<br><b>Sent:</b> Wednesday<br>
          <b>To:</b> jess@example.com<br><b>Cc:</b> reid@example.com<br>
          <b>Subject:</b> Expired Workers Compensation</div>
      </div>
      <div>CAUTION EXTERNAL EMAIL:</div>
      <div>The body of the earlier message in the thread.</div>
    `);

    markQuotedEmailContent(doc);
    expect(visibleText(doc)).toContain('Attached is the certificate');
    expect(visibleText(doc)).toContain('Processing Team');
    expect(quotedText(doc)).toContain('Expired Workers Compensation');
    expect(quotedText(doc)).toContain('The body of the earlier message');
  });

  /**
   * Reduced from corpus body zzdzAqfp too: the reply header sat inside a
   * 779-character wrapper. Applying the "a header block is short" ceiling to
   * the wrapper rather than to the labelled element missed it entirely.
   */
  test('finds a reply header nested inside a large wrapper', () => {
    const doc = parse(`
      <div>Please see the attached certificate and confirm receipt when you can.</div>
      <div>
        <p>Some surrounding markup that makes this wrapper substantially longer
           than a header block would be on its own, with several sentences of
           filler so the element comfortably exceeds the size ceiling.</p>
        <div><b>From:</b> A<br><b>Sent:</b> Mon<br><b>Subject:</b> Original</div>
      </div>
    `);

    markQuotedEmailContent(doc);
    expect(visibleText(doc)).toContain('Please see the attached certificate');
    expect(quotedText(doc)).toContain('Original');
  });
});

describe('quoted content — other clients (fixture-covered, not in our corpus)', () => {
  test('collapses a Gmail reply and keeps the attribution with the quote', () => {
    const doc = parse(`
      <div dir="ltr">whatcha doing</div>
      <div class="gmail_quote">
        <div dir="ltr" class="gmail_attr">
          On Thu, 3 Sept 2026 at 17:08, Rajat Mathew &lt;rajatmathew10@outlook.com&gt; wrote:
        </div>
        <blockquote class="gmail_quote"><div>All good man, how are you?</div></blockquote>
      </div>
    `);

    markQuotedEmailContent(doc);
    expect(visibleText(doc)).toBe('whatcha doing');
    expect(quotedText(doc)).toContain('All good man, how are you?');
    expect(quotedText(doc)).toContain('wrote:');
  });

  test('pulls a bare attribution line into the quote', () => {
    const doc = parse(`
      <div>Sounds good.</div>
      <div>On Thu, 3 Sept 2026 at 17:08, Rajat Mathew wrote:</div>
      <blockquote type="cite"><div>Original question</div></blockquote>
    `);

    markQuotedEmailContent(doc);
    expect(visibleText(doc)).toBe('Sounds good.');
    expect(quotedText(doc)).toContain('On Thu, 3 Sept 2026');
  });

  test('collapses a Yahoo quote', () => {
    const doc = parse(`
      <div>Thanks!</div>
      <div class="yahoo_quoted" id="yahoo_quoted_123"><div>Earlier message</div></div>
    `);

    markQuotedEmailContent(doc);
    expect(visibleText(doc)).toBe('Thanks!');
    expect(quotedText(doc)).toContain('Earlier message');
  });

  test('collapses a Thunderbird quote including its cite prefix', () => {
    const doc = parse(`
      <p>Agreed, that works for us.</p>
      <div class="moz-cite-prefix">On 03/09/2026 12:37, Rajat wrote:</div>
      <blockquote type="cite" cite="mid:1"><p>Are we still on?</p></blockquote>
    `);

    markQuotedEmailContent(doc);
    expect(visibleText(doc)).toBe('Agreed, that works for us.');
    expect(quotedText(doc)).toContain('Are we still on?');
    expect(quotedText(doc)).toContain('On 03/09/2026');
  });

  test('collapses a Proton quote', () => {
    const doc = parse(`
      <div>Received, thank you.</div>
      <div class="protonmail_quote"><blockquote><p>Invoice attached.</p></blockquote></div>
    `);

    markQuotedEmailContent(doc);
    expect(visibleText(doc)).toBe('Received, thank you.');
    expect(quotedText(doc)).toContain('Invoice attached.');
  });

  test('collapses a Zoho quote', () => {
    const doc = parse(`
      <div>Noted.</div>
      <div class="zmail_extra"><div>Previous correspondence.</div></div>
    `);

    markQuotedEmailContent(doc);
    expect(visibleText(doc)).toBe('Noted.');
    expect(quotedText(doc)).toContain('Previous correspondence.');
  });
});

describe('quoted content — what must never collapse', () => {
  test('leaves an inline reply expanded', () => {
    const doc = parse(`
      <div>Answers below.</div>
      <blockquote><div>What is the lead time?</div></blockquote>
      <div>Six weeks.</div>
      <blockquote><div>And the price?</div></blockquote>
      <div>Unchanged.</div>
    `);

    expect(markQuotedEmailContent(doc)).toBeNull();
    expect(doc.body.querySelector(`[${QUOTE_TOGGLE_ATTRIBUTE}]`)).toBeNull();
  });

  test('collapses only the trailing quote when a reply is written inline above it', () => {
    const doc = parse(`
      <div>Answers below.</div>
      <blockquote><div>What is the lead time?</div></blockquote>
      <div>Six weeks.</div>
      <blockquote><div>Full earlier thread</div></blockquote>
    `);

    markQuotedEmailContent(doc);
    expect(visibleText(doc)).toContain('What is the lead time?');
    expect(visibleText(doc)).toContain('Six weeks.');
    expect(quotedText(doc)).toBe('Full earlier thread');
  });

  test('leaves a message that is nothing but a quote alone', () => {
    const doc = parse(`
      <blockquote class="gmail_quote"><div>Forwarded content only</div></blockquote>
    `);

    expect(markQuotedEmailContent(doc)).toBeNull();
    expect(doc.body.textContent).toContain('Forwarded content only');
  });

  test('does nothing when there is no quote', () => {
    const doc = parse('<div>Just a note about the site visit.</div>');

    expect(markQuotedEmailContent(doc)).toBeNull();
    expect(doc.body.querySelector(`[${QUOTE_TOGGLE_ATTRIBUTE}]`)).toBeNull();
  });

  test('keeps a real image below a quote visible', () => {
    const doc = parse(`
      <div>Short reply, see the plan below.</div>
      <blockquote><div>Earlier message</div></blockquote>
      <div><img src="https://example.com/plan.png" width="640" height="480"></div>
    `);

    expect(markQuotedEmailContent(doc)).toBeNull();
  });

  test('treats a trailing tracking pixel as part of the quote, not as content', () => {
    const doc = parse(`
      <div>Short reply.</div>
      <blockquote><div>Earlier message</div></blockquote>
      <div><img src="https://tracker.example.com/p.gif" width="1" height="1"></div>
    `);

    markQuotedEmailContent(doc);
    expect(visibleText(doc)).toBe('Short reply.');
  });
});

describe('quoted content — signatures', () => {
  test('keeps a signature written above the quote visible', () => {
    const doc = parse(`
      <div>On our way.</div>
      <div class="gmail_signature">Rajat Mathew — Elli NY Design Corp</div>
      <blockquote class="gmail_quote"><div>Are you coming?</div></blockquote>
    `);

    markQuotedEmailContent(doc);
    expect(visibleText(doc)).toContain('Rajat Mathew');
    expect(quotedText(doc)).toBe('Are you coming?');
  });

  test('leaves a signature appended below the quote visible too', () => {
    const doc = parse(`
      <div>On our way.</div>
      <blockquote class="gmail_quote"><div>Are you coming?</div></blockquote>
      <div class="gmail_signature">Rajat Mathew — Elli NY Design Corp</div>
    `);

    markQuotedEmailContent(doc);
    expect(visibleText(doc)).toContain('On our way.');
    expect(visibleText(doc)).toContain('Rajat Mathew');
    expect(quotedText(doc)).toBe('Are you coming?');
  });
});

describe('quoted content — structure of the result', () => {
  test('marks the quote hidden and gives the toggle an accessible label', () => {
    const doc = parse(`
      <div>Reply body text here.</div>
      <blockquote><div>Quote</div></blockquote>
    `);

    const container = markQuotedEmailContent(doc);
    const toggle = doc.body.querySelector(`[${QUOTE_TOGGLE_ATTRIBUTE}]`);

    expect(container?.hidden).toBe(true);
    expect(toggle?.getAttribute('aria-expanded')).toBe('false');
    expect(toggle?.getAttribute('aria-label')).toBe('Show trimmed content');
    expect(toggle?.nextElementSibling).toBe(container);
  });

  test('splits a quote that starts mid-container without losing the reply above it', () => {
    const doc = parse(`
      <div class="wrapper">
        <p>Looks good to me, proceed.</p>
        <blockquote><p>Original request</p></blockquote>
      </div>
    `);

    markQuotedEmailContent(doc);
    expect(visibleText(doc)).toBe('Looks good to me, proceed.');
    expect(quotedText(doc)).toBe('Original request');
  });

  test('is idempotent across re-renders of the same body', () => {
    const html = '<div>Reply body text here.</div><blockquote><div>Quote</div></blockquote>';
    const first = parse(html);
    markQuotedEmailContent(first);
    const second = parse(first.body.innerHTML);
    markQuotedEmailContent(second);

    expect(second.body.querySelectorAll(`[${QUOTE_TOGGLE_ATTRIBUTE}]`)).toHaveLength(1);
  });
});

describe('quoted plain text', () => {
  test('splits at the first quoted line', () => {
    expect(
      splitQuotedPlainText(['Sounds good.', '', 'On Thursday, Rajat wrote:', '> Are we on?'])
    ).toEqual({
      visible: ['Sounds good.', ''],
      quoted: ['On Thursday, Rajat wrote:', '> Are we on?'],
    });
  });

  test('splits at a bare quote marker', () => {
    expect(splitQuotedPlainText(['Confirmed.', '> Please confirm.'])).toEqual({
      visible: ['Confirmed.'],
      quoted: ['> Please confirm.'],
    });
  });

  test('leaves an unquoted body untouched', () => {
    expect(splitQuotedPlainText(['Just a note.'])).toEqual({
      visible: ['Just a note.'],
      quoted: [],
    });
  });

  test('leaves a body that is entirely quoted untouched', () => {
    expect(splitQuotedPlainText(['> Everything here is a quote.'])).toEqual({
      visible: ['> Everything here is a quote.'],
      quoted: [],
    });
  });

  test('does not treat a trailing attribution as a quote start', () => {
    expect(splitQuotedPlainText(['Thanks.', 'On Thursday, Rajat wrote:'])).toEqual({
      visible: ['Thanks.', 'On Thursday, Rajat wrote:'],
      quoted: [],
    });
  });
});
