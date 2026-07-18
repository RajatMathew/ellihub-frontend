export const EMAIL_FOLDERS = [
  { key: 'inbox', label: 'Inbox' },
  { key: 'drafts', label: 'Drafts' },
  { key: 'sent', label: 'Sent Items' },
  { key: 'deleted', label: 'Deleted Items' },
  { key: 'junk', label: 'Junk Email' },
  { key: 'notes', label: 'Notes' },
  { key: 'archive', label: 'Archive' },
  { key: 'history', label: 'Conversation History' },
  { key: 'rss', label: 'RSS Feeds' },
  { key: 'search', label: 'Search Folders' },
] as const;

export type EmailFolderKey = (typeof EMAIL_FOLDERS)[number]['key'];

export function getEmailFolderLabel(folder: EmailFolderKey) {
  return EMAIL_FOLDERS.find((item) => item.key === folder)?.label ?? 'Inbox';
}
