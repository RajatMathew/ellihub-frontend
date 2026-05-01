import { useState } from 'react';

import type { LinkedContactItem } from '@/modules/directory/components/shared';
import {
  useCreateVendorMutation,
  useLinkEntityMutation,
  useUnlinkEntityMutation,
  useUpdateVendorMutation,
} from '@/modules/directory/hooks';
import type {
  PaymentTerms,
  VendorContactLink,
  VendorFormValues,
  VendorStatus,
} from '@/modules/directory/schemas/vendor.schema';
import { toast } from 'sonner';

interface UseSaveVendorParams {
  id: string | undefined;
  isEdit: boolean;
  contactLinks: LinkedContactItem[];
  originalLinks: VendorContactLink[];
  onSaved: (id?: string) => void;
}

export function useSaveVendor({
  id,
  isEdit,
  contactLinks,
  originalLinks,
  onSaved,
}: UseSaveVendorParams) {
  const createMutation = useCreateVendorMutation();
  const updateMutation = useUpdateVendorMutation();
  const unlinkEntityMutation = useUnlinkEntityMutation();
  const linkEntityMutation = useLinkEntityMutation();
  const [isSaving, setIsSaving] = useState(false);

  const isSubmitting = isSaving || createMutation.isPending || updateMutation.isPending;

  const saveVendor = async (formData: VendorFormValues) => {
    setIsSaving(true);
    try {
      if (isEdit && id) {
        await updateMutation.mutateAsync({
          id,
          data: {
            name: formData.name,
            typeId: formData.type || undefined,
            status: formData.status as VendorStatus,
            taxId: formData.taxId || null,
            website: formData.website || null,
            paymentTerms: formData.paymentTerms as PaymentTerms,
          },
        });

        const failedLinks = await persistVendorContactLinks(id, contactLinks, originalLinks, {
          link: linkEntityMutation.mutateAsync,
          unlink: unlinkEntityMutation.mutateAsync,
        });

        if (failedLinks > 0) {
          toast.error(`${failedLinks} contact link operation(s) failed.`);
          return;
        }

        toast.success('Vendor updated.');
        onSaved();
        return;
      }

      const created = await createMutation.mutateAsync({
        name: formData.name,
        typeId: formData.type || undefined,
        status: formData.status as VendorStatus,
        taxId: formData.taxId || undefined,
        website: formData.website || undefined,
        paymentTerms: formData.paymentTerms as PaymentTerms,
      });

      const failedLinks = await persistVendorContactLinks(created.id, contactLinks, [], {
        link: linkEntityMutation.mutateAsync,
        unlink: unlinkEntityMutation.mutateAsync,
      });

      if (failedLinks > 0) {
        toast.error(`${failedLinks} contact link(s) failed to save.`);
      }

      toast.success('Vendor created.');
      onSaved(created.id);
    } catch (error) {
      console.error('Failed to save vendor:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return {
    saveVendor,
    isSubmitting,
  };
}

async function persistVendorContactLinks(
  vendorId: string,
  contactLinks: LinkedContactItem[],
  originalLinks: VendorContactLink[],
  mutations: {
    link: (payload: { contactId: string; vendorId: string }) => Promise<unknown>;
    unlink: (contactId: string) => Promise<unknown>;
  }
) {
  const originalByContact = new Map(originalLinks.map((link) => [link.contactId, link]));
  const currentByContact = new Map(contactLinks.map((link) => [link.contactId, link]));
  const toRemove = originalLinks.filter((link) => !currentByContact.has(link.contactId));
  const toAdd = contactLinks.filter((link) => !originalByContact.has(link.contactId));

  const operations: Promise<unknown>[] = [
    ...toRemove.map((link) => mutations.unlink(link.contactId)),
    ...toAdd.map((link) => mutations.link({ contactId: link.contactId, vendorId })),
  ];

  if (operations.length === 0) return 0;

  const results = await Promise.allSettled(operations);
  return results.filter((result) => result.status === 'rejected').length;
}
