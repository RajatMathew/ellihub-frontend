import { useState } from 'react';

import { useUpdateContactMutation } from '@/modules/directory/hooks/contacts.hooks';
import type { Contact } from '@/modules/directory/schemas/contact.schema';
import { toast } from 'sonner';

export function useContactTags(contact: Contact | undefined, contactId: string | undefined) {
  const updateMutation = useUpdateContactMutation();
  const [showAddTag, setShowAddTag] = useState(false);
  const [newTagValue, setNewTagValue] = useState('');

  const handleAddTag = () => {
    if (!contactId || !contact) return;

    const trimmed = newTagValue.trim();
    if (!trimmed || contact.tags.includes(trimmed)) {
      setNewTagValue('');
      return;
    }

    updateMutation.mutate(
      { id: contactId, data: { tags: [...contact.tags, trimmed] } },
      {
        onSuccess: () => {
          setNewTagValue('');
          toast.success('Tag added.');
        },
        onError: () => toast.error('Failed to add tag.'),
      }
    );
  };

  const handleRemoveTag = (tag: string) => {
    if (!contactId || !contact) return;

    updateMutation.mutate(
      { id: contactId, data: { tags: contact.tags.filter((item) => item !== tag) } },
      {
        onSuccess: () => toast.success('Tag removed.'),
        onError: () => toast.error('Failed to remove tag.'),
      }
    );
  };

  const toggleAddTag = () => {
    setShowAddTag((current) => !current);
  };

  const closeAddTag = () => {
    setShowAddTag(false);
    setNewTagValue('');
  };

  return {
    showAddTag,
    newTagValue,
    isUpdatingTags: updateMutation.isPending,
    setNewTagValue,
    toggleAddTag,
    closeAddTag,
    handleAddTag,
    handleRemoveTag,
  };
}

export type ContactTagsEditor = ReturnType<typeof useContactTags>;
