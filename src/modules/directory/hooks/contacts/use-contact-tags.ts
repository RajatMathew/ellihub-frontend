import { useState } from 'react';

import {
  useAddContactTagMutation,
  useRemoveContactTagMutation,
} from '@/modules/directory/hooks/contacts.hooks';
import type { Contact } from '@/modules/directory/schemas/contact.schema';
import { toast } from 'sonner';

export function useContactTags(contact: Contact | undefined, contactId: string | undefined) {
  const addTagMutation = useAddContactTagMutation();
  const removeTagMutation = useRemoveContactTagMutation();
  const [showAddTag, setShowAddTag] = useState(false);
  const [newTagValue, setNewTagValue] = useState('');

  const handleAddTag = () => {
    if (!contactId || !contact) return;

    const trimmed = newTagValue.trim();
    if (!trimmed || contact.tags.includes(trimmed)) {
      setNewTagValue('');
      return;
    }

    addTagMutation.mutate(
      { contactId, tag: trimmed },
      {
        onSuccess: () => {
          setNewTagValue('');
          toast.success('Tag added.');
        },
      }
    );
  };

  const handleRemoveTag = (tag: string) => {
    if (!contactId || !contact) return;

    removeTagMutation.mutate(
      { contactId, tag },
      {
        onSuccess: () => toast.success('Tag removed.'),
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
    isUpdatingTags: addTagMutation.isPending || removeTagMutation.isPending,
    setNewTagValue,
    toggleAddTag,
    closeAddTag,
    handleAddTag,
    handleRemoveTag,
  };
}

export type ContactTagsEditor = ReturnType<typeof useContactTags>;
