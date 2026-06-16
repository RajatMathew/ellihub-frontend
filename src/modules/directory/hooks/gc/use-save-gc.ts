import { useState } from 'react';

import type { LinkedContactItem } from '@/modules/directory/components/shared';
import {
  useCreateGCMutation,
  useLinkEntityMutation,
  useUnlinkEntityMutation,
  useUpdateGCMutation,
} from '@/modules/directory/hooks';
import type {
  GCContactLink,
  GCFormValues,
  GCStatus,
  PaymentTerms,
} from '@/modules/directory/schemas/gc.schema';
import { toast } from 'sonner';

interface UseSaveGCParams {
  id: string | undefined;
  isEdit: boolean;
  contactLinks: LinkedContactItem[];
  originalLinks: GCContactLink[];
  onSaved: (id?: string) => void;
}

export function useSaveGC({ id, isEdit, contactLinks, originalLinks, onSaved }: UseSaveGCParams) {
  const createMutation = useCreateGCMutation();
  const updateMutation = useUpdateGCMutation();
  const linkEntityMutation = useLinkEntityMutation();
  const unlinkEntityMutation = useUnlinkEntityMutation();
  const [isSaving, setIsSaving] = useState(false);

  const isSubmitting = isSaving || createMutation.isPending || updateMutation.isPending;

  const saveGC = async (formData: GCFormValues) => {
    setIsSaving(true);
    try {
      const payload = {
        name: formData.name,
        gcTypeId: formData.gcTypeId,
        website: formData.website || undefined,
        status: formData.status as GCStatus,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        address: formData.address || undefined,
        paymentTerms: formData.paymentTerms as PaymentTerms,
        retainagePercent: formData.retainagePercent,
      };

      if (isEdit && id) {
        await updateMutation.mutateAsync({ id, data: payload });

        const failedLinks = await persistGCContactLinks(id, contactLinks, originalLinks, {
          link: linkEntityMutation.mutateAsync,
          unlink: unlinkEntityMutation.mutateAsync,
        });

        if (failedLinks > 0) {
          toast.error(`${failedLinks} contact link operation(s) failed.`);
          return;
        }

        toast.success('General contractor updated.');
        onSaved();
        return;
      }

      const created = await createMutation.mutateAsync(payload);
      const failedLinks = await persistGCContactLinks(created.id, contactLinks, [], {
        link: linkEntityMutation.mutateAsync,
        unlink: unlinkEntityMutation.mutateAsync,
      });

      if (failedLinks > 0) {
        toast.error(`${failedLinks} contact link(s) failed to save.`);
      }

      toast.success('General contractor created.');
      onSaved(created.id);
    } catch (error) {
      console.error('Failed to save general contractor:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return {
    saveGC,
    isSubmitting,
  };
}

async function persistGCContactLinks(
  generalContractorId: string,
  contactLinks: LinkedContactItem[],
  originalLinks: GCContactLink[],
  mutations: {
    link: (payload: {
      contactId: string;
      generalContractorId: string;
      isPrimary?: boolean;
      replaceExisting?: boolean;
    }) => Promise<unknown>;
    unlink: (contactId: string) => Promise<unknown>;
  }
) {
  const originalByContact = new Map(originalLinks.map((link) => [link.contactId, link]));
  const currentByContact = new Map(contactLinks.map((link) => [link.contactId, link]));
  const toRemove = originalLinks.filter((link) => !currentByContact.has(link.contactId));
  const toPersist = contactLinks.filter((link) => {
    const original = originalByContact.get(link.contactId);
    return !original || original.isPrimary !== link.isPrimary;
  });

  let failed = 0;

  for (const link of toRemove) {
    try {
      await mutations.unlink(link.contactId);
    } catch {
      failed += 1;
    }
  }

  for (const link of toPersist) {
    try {
      await mutations.link({
        contactId: link.contactId,
        generalContractorId,
        isPrimary: link.isPrimary,
        replaceExisting: link.replaceExisting,
      });
    } catch {
      failed += 1;
    }
  }

  return failed;
}
