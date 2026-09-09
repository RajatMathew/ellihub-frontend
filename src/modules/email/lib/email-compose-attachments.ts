/**
 * Attachment helpers shared by every compose surface (the modal and the inline
 * reading-pane composer). They live outside the components so both shells and
 * the `useEmailCompose` controller work from one copy of the rules.
 */

/**
 * Providers cap the WHOLE message, not each file — Outlook silently drops mail
 * whose combined attachments exceed ~25 MB, so the budget must be enforced
 * across every attached file together, mirroring the check in elli-core.
 */
export const MAX_TOTAL_ATTACHMENT_BYTES = 25 * 1024 * 1024;

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function fileKey(file: File) {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

export function fileToAttachment(file: File) {
  return new Promise<{ name: string; mimeType?: string; content: string }>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      resolve({
        name: file.name,
        mimeType: file.type || undefined,
        content: result.split(',')[1] || result,
      });
    };
    reader.onerror = () => reject(new Error(`Could not read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

export function getNewAttachments(
  files: FileList | null,
  current: File[],
  uploadedBytes: number,
  setError: (error: string | null) => void
): File[] {
  if (!files?.length) return [];
  const existing = new Set(current.map(fileKey));
  const incoming = Array.from(files).filter((file) => !existing.has(fileKey(file)));

  // Accept files in the order they were picked while they fit the message
  // budget; everything that would push the total past the limit stays out.
  let usedBytes = uploadedBytes + current.reduce((total, file) => total + file.size, 0);
  const accepted: File[] = [];
  const rejected: File[] = [];
  for (const file of incoming) {
    if (usedBytes + file.size <= MAX_TOTAL_ATTACHMENT_BYTES) {
      accepted.push(file);
      usedBytes += file.size;
    } else {
      rejected.push(file);
    }
  }

  if (rejected.length > 0) {
    const remaining = Math.max(0, MAX_TOTAL_ATTACHMENT_BYTES - usedBytes);
    const names = rejected.map((file) => `${file.name} (${formatFileSize(file.size)})`).join(', ');
    setError(
      `${names} ${rejected.length === 1 ? 'was' : 'were'} not attached — emails are limited to ` +
        `${formatFileSize(MAX_TOTAL_ATTACHMENT_BYTES)} of attachments in total and ` +
        `${formatFileSize(remaining)} remains. Remove an attachment or send it in a separate email.`
    );
  } else {
    setError(null);
  }
  return accepted;
}
