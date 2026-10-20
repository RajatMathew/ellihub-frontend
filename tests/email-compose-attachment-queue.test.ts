import { describe, expect, test } from 'bun:test';

import { createAttachmentPreparationQueue } from '../src/modules/email/lib/email-compose-attachment-queue';
import {
  getAttachmentStatusLabel,
  getUnpreparedAttachments,
  getUploadPercent,
  stripDataUrlPrefix,
} from '../src/modules/email/lib/email-compose-attachments';

function fileOf(name: string, bytes = 8) {
  return new File([new Uint8Array(bytes)], name, { type: 'application/octet-stream' });
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('attachment preparation queue', () => {
  test('a selection made mid-upload queues instead of aborting the one in flight', async () => {
    const started: string[][] = [];
    const aborted: string[][] = [];
    let releaseFirst = () => {};

    const queue = createAttachmentPreparationQueue({
      upload: async (files, signal) => {
        const names = files.map((file) => file.name);
        started.push(names);
        signal.addEventListener('abort', () => aborted.push(names));
        if (started.length === 1) await new Promise<void>((resolve) => (releaseFirst = resolve));
      },
    });

    queue.enqueue([fileOf('first.pdf')]);
    await flush();
    // Second selection arrives while the first is still on the wire.
    queue.enqueue([fileOf('second.pdf')]);
    await flush();

    // Before this change the newer batch called abort() on the older one, so
    // first.pdf's bytes were discarded and re-uploaded later.
    expect(aborted).toEqual([]);
    expect(started).toEqual([['first.pdf']]);

    releaseFirst();
    await queue.settled();
    expect(started).toEqual([['first.pdf'], ['second.pdf']]);
  });

  test('everything that arrives during one upload is coalesced into a single request', async () => {
    const started: string[][] = [];
    let releaseFirst = () => {};

    const queue = createAttachmentPreparationQueue({
      upload: async (files) => {
        started.push(files.map((file) => file.name));
        if (started.length === 1) await new Promise<void>((resolve) => (releaseFirst = resolve));
      },
    });

    queue.enqueue([fileOf('a.pdf')]);
    await flush();
    queue.enqueue([fileOf('b.pdf')]);
    queue.enqueue([fileOf('c.pdf')]);
    releaseFirst();
    await queue.settled();

    // Two requests for three files, not three.
    expect(started).toEqual([['a.pdf'], ['b.pdf', 'c.pdf']]);
  });

  test('cancel still aborts the batch in flight and drops what is waiting', async () => {
    const started: string[][] = [];
    let abortedNames: string[] = [];

    const queue = createAttachmentPreparationQueue({
      upload: (files, signal) => {
        started.push(files.map((file) => file.name));
        return new Promise<void>((resolve) => {
          signal.addEventListener('abort', () => {
            abortedNames = files.map((file) => file.name);
            resolve();
          });
        });
      },
    });

    queue.enqueue([fileOf('big.pdf')]);
    await flush();
    queue.enqueue([fileOf('queued.pdf')]);
    queue.cancel();
    await queue.settled();

    expect(abortedNames).toEqual(['big.pdf']);
    expect(started).toEqual([['big.pdf']]);
  });

  test('reports busy exactly once around a drain, whatever a batch does', async () => {
    const transitions: boolean[] = [];
    const queue = createAttachmentPreparationQueue({
      upload: () => Promise.reject(new Error('upload failed')).catch(() => undefined),
      onBusyChange: (isBusy) => transitions.push(isBusy),
    });

    queue.enqueue([fileOf('a.pdf')]);
    expect(queue.isBusy()).toBe(true);
    await queue.settled();

    expect(transitions).toEqual([true, false]);
    expect(queue.isBusy()).toBe(false);
  });

  test('an empty selection never starts a drain', () => {
    const transitions: boolean[] = [];
    const queue = createAttachmentPreparationQueue({
      upload: () => Promise.resolve(),
      onBusyChange: (isBusy) => transitions.push(isBusy),
    });
    queue.enqueue([]);
    expect(transitions).toEqual([]);
    expect(queue.isBusy()).toBe(false);
  });
});

describe('attachments already delivered to the server', () => {
  test('are never encoded or uploaded a second time', () => {
    const kept = fileOf('kept.pdf', 16);
    const fresh = fileOf('fresh.pdf', 32);
    const prepared = new Set([`kept.pdf:16:${kept.lastModified}`]);

    expect(getUnpreparedAttachments([kept, fresh], prepared)).toEqual([fresh]);
  });

  test('a file differing only in size is still unprepared', () => {
    const original = fileOf('report.pdf', 16);
    const edited = fileOf('report.pdf', 24);
    const prepared = new Set([`report.pdf:16:${original.lastModified}`]);

    expect(getUnpreparedAttachments([edited], prepared)).toEqual([edited]);
  });
});

describe('data URL payload extraction', () => {
  test('takes the base64 body without copying the whole string apart', () => {
    expect(stripDataUrlPrefix('data:application/pdf;base64,QUJD')).toBe('QUJD');
  });

  test('leaves a bare base64 payload alone', () => {
    expect(stripDataUrlPrefix('QUJD')).toBe('QUJD');
  });

  test('keeps everything after the first separator', () => {
    expect(stripDataUrlPrefix('data:text/csv;base64,QSxC')).toBe('QSxC');
  });
});

describe('upload progress', () => {
  test('reports whole percent of the bytes sent', () => {
    expect(getUploadPercent(0, 200)).toBe(0);
    expect(getUploadPercent(50, 200)).toBe(25);
    expect(getUploadPercent(200, 200)).toBe(100);
  });

  test('never overshoots when the transport over-reports', () => {
    expect(getUploadPercent(300, 200)).toBe(100);
  });

  test('is indeterminate when no total is known', () => {
    expect(getUploadPercent(500, undefined)).toBeNull();
    expect(getUploadPercent(500, 0)).toBeNull();
    expect(getUploadPercent(500, Number.POSITIVE_INFINITY)).toBeNull();
  });

  test('the tray shows the percentage rather than an indeterminate wait', () => {
    expect(getAttachmentStatusLabel({ saveStatus: 'saving', percent: 42, sizeBytes: 1024 })).toBe(
      'Uploading 42%'
    );
    expect(getAttachmentStatusLabel({ saveStatus: 'saving', percent: null, sizeBytes: 1024 })).toBe(
      'Preparing…'
    );
    expect(getAttachmentStatusLabel({ saveStatus: 'error', percent: 42, sizeBytes: 1024 })).toBe(
      'Failed'
    );
    expect(getAttachmentStatusLabel({ saveStatus: 'idle', percent: null, sizeBytes: 2048 })).toBe(
      '2 KB'
    );
  });
});
