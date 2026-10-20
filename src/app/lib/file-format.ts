/**
 * What a file's badge says, and what colour it says it in (elli-ui#1042).
 *
 * Pure so it can be tested without rendering anything — the badge component
 * itself is then only markup. See `tests/file-format.test.ts`.
 */

/** The tones a badge can carry. Each is a token defined in every theme. */
export const FILE_FORMAT_TONES = [
  'red',
  'green',
  'blue',
  'cyan',
  'violet',
  'amber',
  'navy',
  'slate',
] as const;

export type FileFormatTone = (typeof FILE_FORMAT_TONES)[number];

/**
 * The formats worth naming. Everything else gets a tone from its own letters
 * (see `getFileFormatTone`), so this list is a preference, not a limit.
 */
const TONE_BY_EXTENSION: Record<string, FileFormatTone> = {
  pdf: 'red',

  xls: 'green',
  xlsx: 'green',
  csv: 'green',
  ods: 'green',

  doc: 'blue',
  docx: 'blue',
  odt: 'blue',
  rtf: 'blue',
  txt: 'blue',
  md: 'blue',

  jpg: 'cyan',
  jpeg: 'cyan',
  png: 'cyan',
  gif: 'cyan',
  webp: 'cyan',
  heic: 'cyan',
  heif: 'cyan',
  svg: 'cyan',
  tif: 'cyan',
  tiff: 'cyan',

  mov: 'violet',
  mp4: 'violet',
  m4v: 'violet',
  webm: 'violet',
  mp3: 'violet',
  wav: 'violet',
  m4a: 'violet',

  zip: 'amber',
  rar: 'amber',
  '7z': 'amber',
  tar: 'amber',
  gz: 'amber',

  // The drawing formats this business actually deals in, which is why #1042
  // asked for the colours in the first place.
  dwg: 'navy',
  dxf: 'navy',
  rvt: 'navy',
  skp: 'navy',
  ifc: 'navy',
};

/** Last resort when the name carries no extension and the MIME type is no help. */
const TONE_BY_MIME_PREFIX: ReadonlyArray<[string, FileFormatTone]> = [
  ['image/', 'cyan'],
  ['video/', 'violet'],
  ['audio/', 'violet'],
  ['text/', 'blue'],
];

const MAX_LABEL_LENGTH = 4;

function getExtension(fileName: string | null | undefined): string {
  if (!fileName) return '';
  const name = fileName.trim();
  const dot = name.lastIndexOf('.');
  if (dot <= 0 || dot === name.length - 1) return '';

  const extension = name.slice(dot + 1).toLowerCase();
  // A dot in the middle of a sentence is not an extension. Anything with a
  // space or a slash after it came from a subject line, not a filename —
  // attached emails are named after their subject and have no extension at all.
  return /^[a-z0-9]{1,8}$/.test(extension) ? extension : '';
}

/**
 * The word on the badge: the extension, uppercased, or `FILE` when there
 * isn't one. Long extensions are clipped rather than shrunk — `XLSX` still
 * reads as a spreadsheet at `XLS`, and a badge that changes width per file
 * makes a list of them ragged.
 */
export function getFileFormatLabel(
  fileName: string | null | undefined,
  mimeType?: string | null
): string {
  const extension = getExtension(fileName);
  if (extension) return extension.slice(0, MAX_LABEL_LENGTH).toUpperCase();

  const subtype = mimeType?.split('/')[1]?.split(/[+;]/)[0]?.trim();
  if (subtype && /^[a-z0-9]{1,8}$/.test(subtype)) {
    return subtype.slice(0, MAX_LABEL_LENGTH).toUpperCase();
  }

  return 'FILE';
}

/**
 * FNV-1a. Any cheap hash would do; what matters is that it is a *function of
 * the extension* and nothing else — #1045 asked for a colour that does not
 * change on refresh, which rules out `Math.random` and anything keyed on a
 * row's position or id.
 */
function hashToneIndex(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return Math.abs(hash) % FILE_FORMAT_TONES.length;
}

/** The tone a file's badge carries. Same file, same colour, every time. */
export function getFileFormatTone(
  fileName: string | null | undefined,
  mimeType?: string | null
): FileFormatTone {
  const extension = getExtension(fileName);
  const known = extension ? TONE_BY_EXTENSION[extension] : undefined;
  if (known) return known;

  if (mimeType) {
    const byMime = TONE_BY_MIME_PREFIX.find(([prefix]) => mimeType.startsWith(prefix));
    if (byMime) return byMime[1];
  }

  // Nothing recognised it. A `.dwg` before it was on the list above landed
  // here, and should keep landing on the same colour it always had.
  return extension ? FILE_FORMAT_TONES[hashToneIndex(extension)] : 'slate';
}
