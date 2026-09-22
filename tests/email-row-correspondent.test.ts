import { describe, expect, test } from 'bun:test';

import {
  emailRowCorrespondent,
  isOutgoingEmailFolder,
} from '../src/modules/email/lib/email-row-correspondent';

/**
 * Sent Items listed the account holder on every row.
 *
 * A mail list is labelled with the other party. In the Inbox that is the
 * sender; in Sent and Drafts the sender is you, so six sent messages read
 * "Rajat Mathew" six times and named nobody they were actually sent to
 * (elli-ui#1115). Those rows are labelled with the recipient instead, prefixed
 * `To:` the way every mail client does it.
 */

const sent = (over: Partial<Parameters<typeof emailRowCorrespondent>[0]> = {}) => ({
  folder: 'sent',
  senderName: 'Rajat Mathew',
  senderEmail: 'rajatmathew10@outlook.com',
  recipientName: 'Aaryan Narayani',
  recipientEmail: 'aaryan@ellicorp.com',
  recipientCount: 1,
  ...over,
});

describe('which folders are labelled by recipient', () => {
  test('the ones the reader sent from', () => {
    expect(isOutgoingEmailFolder('sent')).toBe(true);
    expect(isOutgoingEmailFolder('drafts')).toBe(true);
  });

  test('and nowhere else', () => {
    for (const folder of ['inbox', 'archive', 'junk', 'deleted', '', undefined, null]) {
      expect(isOutgoingEmailFolder(folder)).toBe(false);
    }
  });

  test('whatever case the folder arrives in', () => {
    expect(isOutgoingEmailFolder('SENT')).toBe(true);
  });
});

describe('an inbox row is unchanged', () => {
  test('it is still the sender', () => {
    expect(
      emailRowCorrespondent({
        folder: 'inbox',
        senderName: 'Test In',
        senderEmail: 'testt121121@outlook.com',
        recipientName: 'Rajat Mathew',
        recipientEmail: 'rajatmathew10@outlook.com',
        recipientCount: 1,
      })
    ).toMatchObject({ label: 'Test In', name: 'Test In', outgoing: false });
  });

  test('falling back to the address when the sender has no name', () => {
    expect(
      emailRowCorrespondent({ folder: 'inbox', senderName: '', senderEmail: 'ops@ellicorp.com' })
    ).toMatchObject({ label: 'ops@ellicorp.com' });
  });

  test('and to something readable when it has neither', () => {
    expect(emailRowCorrespondent({ folder: 'inbox' }).label).toBe('Unknown sender');
  });
});

describe('a sent row names the recipient', () => {
  test('prefixed, so it cannot be mistaken for a sender', () => {
    expect(emailRowCorrespondent(sent())).toMatchObject({
      label: 'To: Aaryan Narayani',
      name: 'Aaryan Narayani',
      outgoing: true,
    });
  });

  test('never the account holder, which was the bug', () => {
    expect(emailRowCorrespondent(sent()).label).not.toContain('Rajat Mathew');
  });

  test('counting everyone after the first', () => {
    expect(emailRowCorrespondent(sent({ recipientCount: 3 })).label).toBe('To: Aaryan Narayani +2');
  });

  test('but saying nothing when there is only one', () => {
    expect(emailRowCorrespondent(sent({ recipientCount: 1 })).label).toBe('To: Aaryan Narayani');
  });

  test('falling back to the address when the recipient has no name', () => {
    expect(emailRowCorrespondent(sent({ recipientName: '' })).label).toBe(
      'To: aaryan@ellicorp.com'
    );
  });

  test('a draft with no recipient yet says so, rather than naming you', () => {
    const draft = emailRowCorrespondent(
      sent({ folder: 'drafts', recipientName: '', recipientEmail: '', recipientCount: 0 })
    );

    expect(draft.label).toBe('To: (no recipient)');
    expect(draft.label).not.toContain('Rajat Mathew');
  });

  test('an API that has not shipped the fields yet does not print the sender', () => {
    // The two repos deploy separately. A client ahead of the server gets no
    // recipient at all, and must not silently fall back to the old, wrong label.
    const ahead = emailRowCorrespondent({
      folder: 'sent',
      senderName: 'Rajat Mathew',
      senderEmail: 'rajatmathew10@outlook.com',
    });

    expect(ahead.label).toBe('To: (no recipient)');
    expect(ahead.label).not.toContain('Rajat Mathew');
  });
});

describe('the avatar follows the label', () => {
  test('it takes the one person, not the tally', () => {
    // Initials of "Aaryan Narayani +2" would render as "A+".
    expect(emailRowCorrespondent(sent({ recipientCount: 3 }))).toMatchObject({
      name: 'Aaryan Narayani',
      email: 'aaryan@ellicorp.com',
    });
  });

  test('and the sender in the inbox', () => {
    expect(
      emailRowCorrespondent({
        folder: 'inbox',
        senderName: 'Test In',
        senderEmail: 'testt121121@outlook.com',
      })
    ).toMatchObject({ name: 'Test In', email: 'testt121121@outlook.com' });
  });
});

describe('the folder key survives the list mapping', () => {
  test('the row reads folderKey, because the page overwrites folder with an id', () => {
    // This is exactly how mailbox-page builds a row: the server's well-known
    // key is preserved as `folderKey` and `folder` becomes the folder's ULID.
    // Reading `folder` alone is why the first cut of this fix changed nothing
    // on screen while the API was already sending the recipient.
    expect(
      emailRowCorrespondent({
        folderKey: 'sent',
        folder: '01JBQ2X8H9ZK3M4N5P6Q7R8S9T',
        senderName: 'Rajat Mathew',
        senderEmail: 'rajatmathew10@outlook.com',
        recipientName: 'Sharun Test',
        recipientEmail: 'sharuntest0@outlook.com',
        recipientCount: 1,
      }).label
    ).toBe('To: Sharun Test');
  });

  test('and still reads folder when that is the key, as the raw API row has it', () => {
    expect(
      emailRowCorrespondent({
        folder: 'sent',
        senderName: 'Rajat Mathew',
        recipientName: 'Sharun Test',
        recipientCount: 1,
      }).label
    ).toBe('To: Sharun Test');
  });

  test('an inbox row keyed by id is still the sender', () => {
    expect(
      emailRowCorrespondent({
        folderKey: 'inbox',
        folder: '01JBQ2X8H9ZK3M4N5P6Q7R8S9T',
        senderName: 'Test In',
        senderEmail: 'testt121121@outlook.com',
      }).label
    ).toBe('Test In');
  });
});
