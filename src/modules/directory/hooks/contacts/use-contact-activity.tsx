import { useDirectoryActivity } from '@/modules/directory/hooks/shared';

export function useContactActivity(contactId: string | undefined) {
  return useDirectoryActivity('contact', contactId);
}
