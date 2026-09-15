import { describe, expect, test } from 'bun:test';

import {
  fileKey,
  getNewAttachments,
  MAX_TOTAL_ATTACHMENT_BYTES,
} from '../src/modules/email/lib/email-compose-attachments';

/**
 * Re-attaching a file the composer already holds (elli-ui#945).
 *
 * The tray splits one list of attachments across two pieces of state: files
 * still uploading sit in `attachments`, and files the server has taken move to
 * `existingAttachments`. The dedupe only ever consulted the first, so a file
 * that had finished uploading was invisible to it — and picking that same file
 * again, which is exactly what "drag it in, then open the picker" does, either
 * uploaded the bytes a second time and put the file on the message twice, or
 * added a tray row that could never upload and never clear.
 */

function makeFile(name: string, size: number, lastModified = 1_700_000_000_000): File {
  return new File([new Uint8Array(size)], name, { type: 'text/plain', lastModified });
}

/** The FileList a picker or a drop hands over. */
function fileList(...files: File[]): FileList {
  return {
    length: files.length,
    item: (index: number) => files[index] ?? null,
    [Symbol.iterator]: files[Symbol.iterator].bind(files),
    ...files,
  } as unknown as FileList;
}

function collect() {
  const errors: (string | null)[] = [];
  return { errors, setError: (error: string | null) => errors.push(error) };
}

describe('attaching a file that is already on the draft', () => {
  test('the same file, still uploading, is not added twice', () => {
    const file = makeFile('plan.pdf', 1000);
    const { errors, setError } = collect();

    const added = getNewAttachments(fileList(file), [file], 0, setError);

    expect(added).toEqual([]);
    expect(errors.at(-1)).toContain('already attached');
  });

  test('the same file, already uploaded, is not uploaded again', () => {
    // The file has left the pending tray for the server, which is the state the
    // old dedupe could not see at all.
    const file = makeFile('plan.pdf', 1000);
    const { errors, setError } = collect();

    const added = getNewAttachments(fileList(file), [], 1000, setError, new Set([fileKey(file)]), [
      { name: 'plan.pdf', sizeBytes: 1000 },
    ]);

    expect(added).toEqual([]);
    expect(errors.at(-1)).toContain('already attached');
  });

  test('a reopened draft matches on name and size, since there is no file key', () => {
    // Attachments that came back from the provider carry no lastModified, so
    // `preparedKeys` is empty and only the descriptor can identify them.
    const file = makeFile('plan.pdf', 1000);
    const { setError } = collect();

    const added = getNewAttachments(fileList(file), [], 1000, setError, new Set(), [
      { name: 'plan.pdf', sizeBytes: 1000 },
    ]);

    expect(added).toEqual([]);
  });

  test('a different file that happens to share a name still goes up', () => {
    // Same name, different size: a genuinely different attachment. Blocking it
    // would be a worse bug than the one being fixed.
    const file = makeFile('plan.pdf', 2048);
    const { errors, setError } = collect();

    const added = getNewAttachments(fileList(file), [], 1000, setError, new Set(), [
      { name: 'plan.pdf', sizeBytes: 1000 },
    ]);

    expect(added).toEqual([file]);
    expect(errors.at(-1)).toBeNull();
  });

  test('the duplicate is skipped without taking the files beside it down', () => {
    const duplicate = makeFile('plan.pdf', 1000);
    const fresh = makeFile('photo.png', 2000);
    const { setError } = collect();

    const added = getNewAttachments(
      fileList(duplicate, fresh),
      [],
      1000,
      setError,
      new Set([fileKey(duplicate)]),
      [{ name: 'plan.pdf', sizeBytes: 1000 }]
    );

    expect(added).toEqual([fresh]);
  });

  test('a duplicate does not spend the message budget', () => {
    // The phantom row counted toward the 25 MB cap, so re-picking a large file
    // could disable Send over bytes that were never going to be sent.
    const big = makeFile('drawings.pdf', MAX_TOTAL_ATTACHMENT_BYTES - 1000);
    const { setError } = collect();

    const added = getNewAttachments(
      fileList(big),
      [],
      MAX_TOTAL_ATTACHMENT_BYTES - 1000,
      setError,
      new Set([fileKey(big)]),
      [{ name: 'drawings.pdf', sizeBytes: MAX_TOTAL_ATTACHMENT_BYTES - 1000 }]
    );

    expect(added).toEqual([]);
  });

  test('says so when a file is both a duplicate and another is over budget', () => {
    const duplicate = makeFile('plan.pdf', 1000);
    const huge = makeFile('huge.bin', MAX_TOTAL_ATTACHMENT_BYTES);
    const { errors, setError } = collect();

    getNewAttachments(
      fileList(duplicate, huge),
      [],
      1000,
      setError,
      new Set([fileKey(duplicate)]),
      [{ name: 'plan.pdf', sizeBytes: 1000 }]
    );

    const message = errors.at(-1) ?? '';
    expect(message).toContain('already attached');
    expect(message).toContain('limited to');
  });

  test('a clean selection still clears the previous error', () => {
    const { errors, setError } = collect();

    getNewAttachments(fileList(makeFile('new.txt', 10)), [], 0, setError);

    expect(errors.at(-1)).toBeNull();
  });
});

describe('tray row identity', () => {
  test('two files of the same name and timestamp but different sizes are distinct', () => {
    // The tray keyed its rows on name + lastModified, which these two share.
    const a = makeFile('scan.pdf', 1000, 1_700_000_000_000);
    const b = makeFile('scan.pdf', 2000, 1_700_000_000_000);

    expect(fileKey(a)).not.toBe(fileKey(b));
  });
});
