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
    const email = formData.email?.trim() || null;

    setIsSaving(true);
    try {
      if (isEdit && id) {
        await updateMutation.mutateAsync({
          id,
          data: {
            name: formData.name,
            email,
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
        email: email ?? undefined,
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
    link: (payload: {
      contactId: string;
      vendorId: string;
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
        vendorId,
        isPrimary: link.isPrimary,
        replaceExisting: link.replaceExisting,
      });
    } catch {
      failed += 1;
    }
  }

  return failed;
}
