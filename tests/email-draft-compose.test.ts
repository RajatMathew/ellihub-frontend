import { describe, expect, test } from 'bun:test';

import {
  buildInstantDraftSnapshot,
  createDraftIdentityGate,
  reconcileComposeAttachments,
  reconcileComposeDraftFields,
  shouldApplyDraftHydration,
  toComposeDraftFields,
  type ComposeDraftFields,
} from '../src/modules/email/lib/email-draft-compose';

const listRow = {
  subject: 'Site visit Thursday',
  preview: 'Can we…',
};

const hydratedRow = {
  subject: 'Site visit Thursday',
  to: [{ address: 'bob@example.com', name: 'Bob Vance' }],
  cc: [{ address: 'cc@example.com' }],
  body: ['<p>Can we meet at 9?</p>'],
  attachments: [{ id: 'a1', name: 'plan.pdf' }],
};

describe('buildInstantDraftSnapshot', () => {
  test('opens the composer from the summary row alone when nothing richer is cached', () => {
    const snapshot = buildInstantDraftSnapshot([undefined, null, listRow]);

    expect(snapshot.fields.subject).toBe('Site visit Thursday');
    expect(snapshot.fields.to).toBe('');
    expect(snapshot.hasBody).toBe(false);
    expect(snapshot.attachments).toEqual([]);
  });

  test('takes recipients and body from the richest cached copy', () => {
    const snapshot = buildInstantDraftSnapshot([hydratedRow, listRow]);

    expect(snapshot.fields.to).toBe('Bob Vance <bob@example.com>');
    expect(snapshot.fields.cc).toBe('cc@example.com');
    expect(snapshot.fields.body).toContain('Can we meet at 9?');
    expect(snapshot.hasBody).toBe(true);
    expect(snapshot.attachments).toHaveLength(1);
  });

  test('drops the provider placeholder subject instead of showing it in the field', () => {
    const snapshot = buildInstantDraftSnapshot([{ subject: '(No subject)' }]);

    expect(snapshot.fields.subject).toBe('');
  });

  test('returns empty fields when there is nothing cached at all', () => {
    const snapshot = buildInstantDraftSnapshot([]);

    expect(snapshot.fields).toEqual({ to: '', cc: '', bcc: '', subject: '', body: '' });
    expect(snapshot.hasBody).toBe(false);
  });
});

describe('reconcileComposeDraftFields', () => {
  const opened: ComposeDraftFields = {
    to: '',
    cc: '',
    bcc: '',
    subject: 'Site visit Thursday',
    body: '',
  };
  const incoming = toComposeDraftFields(hydratedRow);

  test('fills untouched fields from the server once the draft loads', () => {
    const merged = reconcileComposeDraftFields(opened, { ...opened }, incoming);

    expect(merged.to).toBe('Bob Vance <bob@example.com>');
    expect(merged.body).toContain('Can we meet at 9?');
  });

  test('keeps what the user typed while the draft was still loading', () => {
    const current: ComposeDraftFields = {
      ...opened,
      to: 'sam@example.com',
      subject: 'Rescheduled',
    };
    const merged = reconcileComposeDraftFields(opened, current, incoming);

    expect(merged.to).toBe('sam@example.com');
    expect(merged.subject).toBe('Rescheduled');
    // Untouched fields still hydrate.
    expect(merged.cc).toBe('cc@example.com');
    expect(merged.body).toContain('Can we meet at 9?');
  });

  test('treats an emptied contenteditable as unedited so the body still arrives', () => {
    const current: ComposeDraftFields = { ...opened, body: '<div><br></div>' };
    const merged = reconcileComposeDraftFields(opened, current, incoming);

    expect(merged.body).toContain('Can we meet at 9?');
  });

  test('never overwrites a body the user is part-way through writing', () => {
    const current: ComposeDraftFields = { ...opened, body: '<div>Half a sentence</div>' };
    const merged = reconcileComposeDraftFields(opened, current, incoming);

    expect(merged.body).toBe('<div>Half a sentence</div>');
  });
});

describe('reconcileComposeAttachments', () => {
  const incoming = [{ id: 'a1', name: 'plan.pdf' }];

  test('takes the server list when the tray is untouched', () => {
    expect(
      reconcileComposeAttachments({
        current: [],
        incoming,
        hasPendingFiles: false,
        removedAttachmentIds: [],
      })
    ).toEqual(incoming);
  });

  test('does not resurrect an attachment the user removed while it loaded', () => {
    expect(
      reconcileComposeAttachments({
        current: [],
        incoming,
        hasPendingFiles: false,
        removedAttachmentIds: ['a1'],
      })
    ).toEqual([]);
  });

  test('does not drop a file the user is uploading', () => {
    const current = [{ id: 'a2', name: 'photo.png' }];
    expect(
      reconcileComposeAttachments({
        current,
        incoming,
        hasPendingFiles: true,
        removedAttachmentIds: [],
      })
    ).toEqual(current);
  });
});

describe('shouldApplyDraftHydration', () => {
  test('ignores the slower of two responses when a second draft was clicked', () => {
    expect(shouldApplyDraftHydration('message-2', 'message-1')).toBe(false);
    expect(shouldApplyDraftHydration('message-2', 'message-2')).toBe(true);
  });

  test('ignores a response that lands after the composer closed', () => {
    expect(shouldApplyDraftHydration(null, 'message-1')).toBe(false);
  });
});

describe('createDraftIdentityGate', () => {
  test('holds a save until the draft id arrives, so no duplicate draft is created', async () => {
    const gate = createDraftIdentityGate();
    let settled: string | null = null;
    const waiting = gate.wait().then((state) => (settled = state));

    expect(gate.state).toBe('pending');
    expect(settled).toBeNull();

    gate.resolve();
    await waiting;
    expect(settled).toBe('ready');
    expect(gate.state).toBe('ready');
  });

  test('reports an unavailable identity so writes can refuse instead of guessing', async () => {
    const gate = createDraftIdentityGate();
    gate.fail();

    expect(await gate.wait()).toBe('unavailable');
  });

  test('stands waiters down when the composer moves to another draft', async () => {
    const gate = createDraftIdentityGate();
    const waiting = gate.wait();
    gate.cancel();

    expect(await waiting).toBe('cancelled');
  });

  test('keeps its first outcome — a late failure cannot unsettle a ready gate', async () => {
    const gate = createDraftIdentityGate();
    gate.resolve();
    gate.fail();

    expect(await gate.wait()).toBe('ready');
  });
});
