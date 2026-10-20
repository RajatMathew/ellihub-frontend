import { describe, expect, test } from 'bun:test';

import {
  attachmentReminder,
  findAttachmentMention,
} from '../src/modules/email/lib/email-attachment-reminder';
import { EMAIL_SIGNATURE_CLASS } from '../src/modules/email/lib/email-html-policy';

// "Please find attached the invoice" with nothing attached: sending stops to
// ask, the way Zoho Mail does. Only what the sender typed counts, and only a
// phrase that says a file goes with *this* message — not the bare word
// (elli-ui#1338: "i reviewd the attachments its good" used to ask).

const asks = (text: string) => findAttachmentMention(`<p>${text}</p>`);

describe('a message that promises a file', () => {
  test('quotes the phrase the writer used', () => {
    expect(findAttachmentMention('<p>please find attached the invoice</p>')).toBe(
      'please find attached'
    );
    expect(asks("I've attached the drawings")).toBe("I've attached");
    expect(asks('Attached please find the quote')).toBe('Attached please find');
  });

  test.each([
    // The seed phrases from the issue.
    'find attached',
    'see attached',
    'i have attached',
    // Sending it as an attachment, in this email.
    'Sending the invoice as an attachment.',
    "I'm forwarding both drawings as attachments",
    // Instructions to the reader.
    'Please find attached the invoice',
    'Pls find attached',
    'plz see attached',
    'Kindly find attached the agreement',
    'PFA',
    'pfa the quote',
    'P.F.A. the revised plans',
    'Please see the attachment for details.',
    'See attachment',
    'See attachments for the photos',
    'Find the attached file',
    'Please find the revised invoice attached',
    "You'll find the invoice attached",
    'You will find attached the schedule',
    'Please review the attached and let me know',
    'Please sign the attached contract',
    'Kindly fill out the attached form',
    'Can you please review the attached?',
    // The writer doing it.
    "I've attached the invoice",
    'I’ve attached the invoice', // typographic apostrophe
    'Ive attached the file',
    'I attached the revised plans',
    'i have also attached the plan',
    'We have enclosed the contract',
    "I'm attaching the drawings now",
    'im attaching the file',
    'I am attaching the photos',
    'We are attaching both quotes',
    "I'll attach the drawings",
    'I will attach both files',
    "I've included the file",
    "I'm including a copy of the invoice",
    "I've re-attached the file",
    // Presenting it.
    'Attached is the signed contract.',
    'Attached are the drawings',
    'Attached please find the quote',
    'Also attached is the schedule',
    'Attaching the quote for your review',
    'Enclosed is the signed contract.',
    'Please find enclosed the agreement',
    'Herewith attached the quote',
    'Here is the attachment',
    "Here's the attached invoice",
    "I'm sending you the attached quote",
    'The details are in the attached',
    'As per the attached quote, the total is 5k',
    'The attached invoice shows the new total',
    'Invoice attached.',
    'Revised drawings attached for your review',
    'The drawings are attached',
    "It's attached for your review",
    'Your invoice is attached',
    'Attachments: 2',
    // Light typos.
    'Pls find attched',
    'Please find atached the invoice',
    'I have attatched the file',
    // In the middle of other text.
    'Hi John, see attached.',
    'Thanks for the call, please find attached the minutes',
    'Thanks for the call please find attached the minutes',
    'No worries, please find attached',
    'Great meeting today. I have attached the notes. Talk soon!',
  ])('asks: %s', (text) => {
    expect(asks(text)).not.toBeNull();
  });

  test('reads each paragraph as its own line', () => {
    expect(findAttachmentMention('<p>Thanks</p><p>See attached</p>')).toBe('See attached');
    expect(findAttachmentMention('<div>Hi team,<br>find attached the quote</div>')).toBe(
      'find attached'
    );
  });
});

describe('a message that only talks about a file', () => {
  test.each([
    // The case from the issue, and its neighbours: someone else's file.
    'i reviewd the attachments its good',
    'I reviewed the attachments, looks good',
    'The attachments look good',
    'Got the attachments, thanks',
    'thanks for the attachment',
    'Thanks for the attached',
    'Thanks for sending the attached',
    'your attached invoice looks good',
    'The attachment you sent is blank',
    'The attached invoice you sent is wrong',
    'I opened the attachment and it looks fine',
    'I see the attachment now thanks',
    'Can you resend the attachment',
    'Did you get the attachment?',
    'attachment',
    // Negated.
    "I couldn't open the attachment",
    "I haven't attached anything",
    'I have not attached the file',
    "I can't see the attachment",
    'no attachment needed',
    'No file attached',
    'Nothing is attached',
    'We forgot to attach the file',
    // Not coming with this message.
    "I'll attach it later",
    'I will attach the drawings in a separate email',
    "I'll attach the file once it's ready",
    'If needed I can attach the invoice',
    'I attached it to my last email',
    'I attached the invoice to the previous message',
    // A question about a file.
    'Should I attach the invoice?',
    'Where can I find the attachment?',
    // "Attached" in another sense.
    'We are attached to the project',
    'He is attached to the team',
    "I'm really attached to this design",
    'The label is attached to the crate',
    // Inside other words.
    'We were attachedness-free',
    'unenclosed area',
    'reattachment surgery went fine',
    // Nothing at all.
    'Thanks, see you tomorrow.',
    // Sent before, or sending later — not with this message.
    'I sent it as an attachment last week',
    "I'll be sending the invoice as an attachment in a separate email",
  ])('stays quiet: %s', (text) => {
    expect(asks(text)).toBeNull();
  });

  test('ignores the signature', () => {
    const body = `<p>Thanks!</p><div class="${EMAIL_SIGNATURE_CLASS}"><p>Confidential; see attached terms.</p></div>`;

    expect(findAttachmentMention(body)).toBeNull();
  });

  test('ignores quoted history under a reply', () => {
    const body =
      '<p>Sounds good.</p><blockquote><p>Please find attached the quote.</p></blockquote>';

    expect(findAttachmentMention(body)).toBeNull();
  });

  test('ignores a Gmail-quoted reply', () => {
    const body =
      '<p>Looks good to me.</p><div class="gmail_quote"><p>On Mon, Bob wrote:</p><p>I have attached the drawings.</p></div>';

    expect(findAttachmentMention(body)).toBeNull();
  });

  test('ignores an Outlook-quoted reply', () => {
    const body =
      '<p>Approved.</p><div id="divRplyFwdMsg"><p>From: Bob</p></div><div><p>Please see attached invoice.</p></div>';

    expect(findAttachmentMention(body)).toBeNull();
  });
});

describe('whether sending stops to ask', () => {
  const body = '<p>Please find attached the invoice</p>';

  test('asks when the message promises a file and none is attached', () => {
    expect(attachmentReminder({ bodyHtml: body, attachmentCount: 0 })).toBe('Please find attached');
  });

  test('goes straight through once a file is attached', () => {
    expect(attachmentReminder({ bodyHtml: body, attachmentCount: 1 })).toBeNull();
  });

  test('goes straight through for a reply about the other side’s files', () => {
    expect(
      attachmentReminder({
        bodyHtml: '<p>i reviewd the attachments its good</p>',
        attachmentCount: 0,
      })
    ).toBeNull();
  });
});
