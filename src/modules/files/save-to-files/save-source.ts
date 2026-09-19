import api from '@/app/api';

/**
 * Everything the picker can save. Kinds are grouped by how they reach storage:
 *
 * - `file` / `blob` / `apiUrl` / `lazy` — resolved to a `File` in the browser
 *   and pushed through the normal upload pipeline (chunking, progress, retry).
 * - `externalUrl` / `existing` — handed to the API, because the browser either
 *   cannot fetch the bytes (CORS) or should not re-upload bytes it already has.
 *
 * `lazy` exists so an expensive download (email attachment, generated PDF) only
 * runs once the user has actually confirmed a destination folder.
 */
export type SaveToFilesSource =
  | { kind: 'file'; file: File; name?: string }
  | { kind: 'blob'; blob: Blob; fileName: string; mimeType?: string; name?: string }
  | { kind: 'apiUrl'; url: string; fileName: string; mimeType?: string; name?: string }
  | {
      kind: 'lazy';
      fileName: string;
      mimeType?: string;
      name?: string;
      resolve: () => Promise<Blob | File>;
    }
  | { kind: 'externalUrl'; url: string; fileName?: string; mimeType?: string; name?: string }
  | {
      kind: 'existing';
      fileId: string;
      fileName: string;
      name?: string;
      mode?: 'copy' | 'move';
    };

export type SaveToFilesSourceKind = SaveToFilesSource['kind'];

/**
 * One source or several, as a list. The picker saves a single file and a
 * multi-selection through the same path (elli-ui#1046), so callers hand it
 * whichever they have and everything downstream sees an array.
 */
export type SaveToFilesInputSource = SaveToFilesSource | SaveToFilesSource[];

export function toSaveSourceList(source: SaveToFilesInputSource): SaveToFilesSource[] {
  return Array.isArray(source) ? source : [source];
}

const FALLBACK_FILE_NAME = 'download';

/** Kinds the API performs on the server; no local bytes are ever read. */
export function isServerSideSource(source: SaveToFilesSource): boolean {
  return source.kind === 'externalUrl' || source.kind === 'existing';
}

function getFileNameFromUrl(url: string): string {
  try {
    const parsed = new URL(url, globalThis.location?.origin ?? 'http://localhost');
    const lastSegment = parsed.pathname.split('/').filter(Boolean).at(-1);

    return lastSegment ? decodeURIComponent(lastSegment) : FALLBACK_FILE_NAME;
  } catch {
    return FALLBACK_FILE_NAME;
  }
}

/** The on-disk name, extension included. */
export function getSourceFileName(source: SaveToFilesSource): string {
  switch (source.kind) {
    case 'file':
      return source.file.name;
    case 'externalUrl':
      return source.fileName || getFileNameFromUrl(source.url);
    default:
      return source.fileName;
  }
}

export function getSourceMimeType(source: SaveToFilesSource): string | undefined {
  switch (source.kind) {
    case 'file':
      return source.file.type || undefined;
    case 'existing':
      return undefined;
    default:
      return source.mimeType;
  }
}

export function getSourceSizeBytes(source: SaveToFilesSource): number | undefined {
  if (source.kind === 'file') return source.file.size;
  if (source.kind === 'blob') return source.blob.size;

  return undefined;
}

function getBaseName(fileName: string): string {
  const dotIndex = fileName.lastIndexOf('.');

  return dotIndex > 0 ? fileName.slice(0, dotIndex) : fileName;
}

/**
 * Default value for the name field. Matches the upload dialog: the extension
 * is kept on the underlying file and left out of the display name.
 */
export function getSourceDefaultName(source: SaveToFilesSource): string {
  return source.name?.trim() || getBaseName(getSourceFileName(source));
}

function toFile(blob: Blob, fileName: string, mimeType?: string): File {
  if (blob instanceof File && blob.name === fileName) return blob;

  return new File([blob], fileName, {
    type: mimeType || blob.type || 'application/octet-stream',
    lastModified: Date.now(),
  });
}

/** Fetches through the app axios instance so auth headers travel with it. */
async function fetchApiBlob(url: string): Promise<Blob> {
  const res = await api.get<Blob>(url, { responseType: 'blob', timeout: 0 });

  return res.data;
}

/**
 * Materialises a browser-uploadable `File`. Throws for the server-side kinds —
 * callers must route those to the import/copy endpoints instead.
 */
export async function resolveSaveSourceFile(source: SaveToFilesSource): Promise<File> {
  const fileName = getSourceFileName(source);

  switch (source.kind) {
    case 'file':
      return source.file;
    case 'blob':
      return toFile(source.blob, fileName, source.mimeType);
    case 'apiUrl':
      return toFile(await fetchApiBlob(source.url), fileName, source.mimeType);
    case 'lazy':
      return toFile(await source.resolve(), fileName, source.mimeType);
    default:
      throw new Error('This source is saved by the server and has no local file.');
  }
}
