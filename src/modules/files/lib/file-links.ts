import type { FileItem, FileLink } from '@/modules/files/schemas/file.schema';

/**
 * Links that stop a file being deleted. A link whose owner is itself deleted is
 * still reported by the API, but no longer holds the file, so it is dropped
 * here to match what the server enforces.
 */
export function getBlockingFileLinks(file: Pick<FileItem, 'links'>): FileLink[] {
  return (file.links ?? []).filter((link) => !link.ownerDeleted);
}

/** Names the owners holding a file, e.g. "RFQ RFQ-0042, Purchase order PO-0007". */
export function describeFileLinks(links: FileLink[]): string {
  return links.map((link) => `${link.linkLabel} ${link.ownerLabel}`).join(', ');
}

/**
 * Short label for the badge. One owner is named outright; several collapse to a
 * count, with the full list left to the tooltip.
 */
export function getFileLinkBadgeLabel(links: FileLink[]): string | null {
  if (links.length === 0) return null;
  if (links.length === 1) return links[0].ownerLabel;

  return `${links.length} records`;
}

/** Sentence explaining why a linked file cannot be deleted. */
export function getFileLinkBlockedReason(links: FileLink[]): string | null {
  if (links.length === 0) return null;

  return `Attached to ${describeFileLinks(links)}. Remove the attachment there before deleting the file.`;
}
