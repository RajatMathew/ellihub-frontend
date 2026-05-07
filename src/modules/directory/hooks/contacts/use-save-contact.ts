import { useState } from 'react';

import {
  useCreateContactMutation,
  useLinkEntityMutation,
  useUnlinkEntityMutation,
  useUpdateContactMutation,
} from '@/modules/directory/hooks/contacts.hooks';
import type { PendingContactAssociation } from '@/modules/directory/components/contacts/form/contact-form.types';
import type {
  ContactFormValues,
  CreateContactInput,
} from '@/modules/directory/schemas/contact.schema';
import { toast } from 'sonner';

interface UseSaveContactArgs {
  contactId: string | undefined;
  isEdit: boolean;
  primaryVendorId: string | undefined;
  primaryGCId: string | undefined;
  initialAssociation: Pick<PendingContactAssociation, 'id' | 'type'> | null;
  onSaved: () => void;
}

export function useSaveContact({
  contactId,
  isEdit,
  primaryVendorId,
  primaryGCId,
  initialAssociation,
  onSaved,
}: UseSaveContactArgs) {
  const [isSaving, setIsSaving] = useState(false);
  const createMutation = useCreateContactMutation();
  const updateMutation = useUpdateContactMutation();
  const linkEntityMutation = useLinkEntityMutation();
  const unlinkMutation = useUnlinkEntityMutation();

  const saveContact = async (formData: ContactFormValues) => {
    setIsSaving(true);

    try {
      const email = formData.email?.email || undefined;
      const phoneNumber = formData.phoneNumber?.number || undefined;
      const nextAssociation = getSelectedAssociation(primaryVendorId, primaryGCId);

      if (isEdit && contactId) {
        await updateMutation.mutateAsync({
          id: contactId,
          data: {
            fullName: formData.fullName,
            professionalRoleId: formData.professionalRoleId ?? null,
            email,
            phoneNumber,
            tags: formData.tags,
            vendorId: primaryVendorId,
            generalContractorId: primaryGCId,
          },
        });

        if (nextAssociation && hasAssociationChanged(initialAssociation, nextAssociation)) {
          await linkEntityMutation.mutateAsync({
            contactId,
            vendorId: primaryVendorId,
            generalContractorId: primaryGCId,
          });
        } else if (!nextAssociation && initialAssociation) {
          await unlinkMutation.mutateAsync(contactId);
        }

        toast.success('Contact updated successfully.');
        onSaved();
        return;
      }

      const payload: CreateContactInput = {
        fullName: formData.fullName,
        professionalRoleId: formData.professionalRoleId ?? undefined,
        email,
        phoneNumber,
        tags: formData.tags,
        vendorId: primaryVendorId,
        generalContractorId: primaryGCId,
      };

      const newContact = await createMutation.mutateAsync(payload);

      if (nextAssociation) {
        await linkEntityMutation.mutateAsync({
          contactId: newContact.id,
          vendorId: primaryVendorId,
          generalContractorId: primaryGCId,
        });
      }

      toast.success('Contact created successfully.');
      onSaved();
    } catch (error) {
      console.error('Failed to save contact:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return {
    saveContact,
    isSubmitting:
      isSaving ||
      createMutation.isPending ||
      updateMutation.isPending ||
      linkEntityMutation.isPending ||
      unlinkMutation.isPending,
  };
}

function getSelectedAssociation(
  primaryVendorId: string | undefined,
  primaryGCId: string | undefined
): Pick<PendingContactAssociation, 'id' | 'type'> | null {
  if (primaryVendorId) return { id: primaryVendorId, type: 'VENDOR' };
  if (primaryGCId) return { id: primaryGCId, type: 'GC' };

  return null;
}

function hasAssociationChanged(
  current: Pick<PendingContactAssociation, 'id' | 'type'> | null,
  next: Pick<PendingContactAssociation, 'id' | 'type'>
) {
  return !current || current.id !== next.id || current.type !== next.type;
}
