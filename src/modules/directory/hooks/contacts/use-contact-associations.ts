import { useMemo, useState } from 'react';

import type {
  ContactAssociationType,
  ContactGCAssociation,
  ContactVendorAssociation,
  DirectorySelectOption,
  PendingContactAssociation,
  PendingContactUnlink,
} from '@/modules/directory/components/contacts/form/contact-form.types';
import type { Contact } from '@/modules/directory/schemas/contact.schema';

interface UseContactAssociationsArgs {
  contact: Contact | undefined;
  isEdit: boolean;
  vendorOptions: DirectorySelectOption[];
  gcOptions: DirectorySelectOption[];
}

export function useContactAssociations({
  contact,
  isEdit,
  vendorOptions,
  gcOptions,
}: UseContactAssociationsArgs) {
  const [initialAssociation] = useState(() => getContactAssociation(isEdit ? contact : undefined));
  const [vendorLinks, setVendorLinks] = useState<ContactVendorAssociation[]>(() =>
    buildVendorLinks(isEdit ? contact : undefined)
  );
  const [gcLinks, setGCLinks] = useState<ContactGCAssociation[]>(() =>
    buildGCLinks(isEdit ? contact : undefined)
  );
  const [vendorDialogOpen, setVendorDialogOpen] = useState(false);
  const [gcDialogOpen, setGCDialogOpen] = useState(false);
  const [pendingAssociation, setPendingAssociation] = useState<PendingContactAssociation | null>(
    null
  );
  const [showReplaceConfirm, setShowReplaceConfirm] = useState(false);
  const [pendingUnlink, setPendingUnlink] = useState<PendingContactUnlink | null>(null);
  const [showUnlinkConfirm, setShowUnlinkConfirm] = useState(false);

  const currentAssociation = useMemo(() => {
    const vendorLink = vendorLinks[0];
    if (vendorLink) {
      return {
        id: vendorLink.vendorId,
        name:
          vendorLink.name ??
          vendorOptions.find((option) => option.value === vendorLink.vendorId)?.label ??
          'Current Vendor',
        type: 'VENDOR' as const,
      };
    }

    const gcLink = gcLinks[0];
    if (gcLink) {
      return {
        id: gcLink.generalContractorId,
        name:
          gcLink.name ??
          gcOptions.find((option) => option.value === gcLink.generalContractorId)?.label ??
          'Current GC',
        type: 'GC' as const,
      };
    }

    return null;
  }, [gcLinks, gcOptions, vendorLinks, vendorOptions]);

  const primaryVendorId = vendorLinks[0]?.vendorId;
  const primaryGCId = gcLinks[0]?.generalContractorId;
  const selectedAssociationIsPrimary = vendorLinks[0]?.isPrimary ?? gcLinks[0]?.isPrimary ?? false;

  const replaceAssociation = (next: PendingContactAssociation) => {
    setVendorLinks(
      next.type === 'VENDOR' ? [{ vendorId: next.id, isPrimary: true, name: next.name }] : []
    );
    setGCLinks(
      next.type === 'GC'
        ? [{ generalContractorId: next.id, isPrimary: true, name: next.name }]
        : []
    );
  };

  const handleAddAssociation = (id: string, type: ContactAssociationType, name?: string) => {
    if (currentAssociation) {
      if (currentAssociation.id === id && currentAssociation.type === type) return;
      setPendingAssociation({ id, type, name });
      setShowReplaceConfirm(true);
      return;
    }

    replaceAssociation({ id, type, name });
  };

  const confirmReplace = () => {
    if (!pendingAssociation) return;
    replaceAssociation(pendingAssociation);
    setPendingAssociation(null);
    setShowReplaceConfirm(false);
  };

  const handleUnlinkClick = (index: number, type: ContactAssociationType, name: string) => {
    setPendingUnlink({ index, type, name });
    setShowUnlinkConfirm(true);
  };

  const confirmUnlink = () => {
    if (!pendingUnlink) return;

    if (pendingUnlink.type === 'VENDOR') {
      setVendorLinks((prev) => prev.filter((_, index) => index !== pendingUnlink.index));
    } else {
      setGCLinks((prev) => prev.filter((_, index) => index !== pendingUnlink.index));
    }

    setPendingUnlink(null);
    setShowUnlinkConfirm(false);
  };

  const handleVendorCreated = (vendor: { id: string; name: string }) => {
    handleAddAssociation(vendor.id, 'VENDOR', vendor.name);
  };

  const handleGCCreated = (gc: { id: string; name: string }) => {
    handleAddAssociation(gc.id, 'GC', gc.name);
  };

  return {
    vendorLinks,
    gcLinks,
    vendorDialogOpen,
    setVendorDialogOpen,
    gcDialogOpen,
    setGCDialogOpen,
    pendingAssociation,
    showReplaceConfirm,
    setShowReplaceConfirm,
    pendingUnlink,
    showUnlinkConfirm,
    setShowUnlinkConfirm,
    initialAssociation,
    currentAssociation,
    primaryVendorId,
    primaryGCId,
    selectedAssociationIsPrimary,
    setVendorLinks,
    setGCLinks,
    handleAddAssociation,
    handleUnlinkClick,
    confirmReplace,
    confirmUnlink,
    handleVendorCreated,
    handleGCCreated,
  };
}

function getContactAssociation(contact?: Contact) {
  if (!contact) return null;

  const vendorId =
    contact.vendorLinks.find((link) => link.isPrimary)?.vendorId ??
    contact.vendorLinks[0]?.vendorId ??
    contact.vendorId;

  if (vendorId) {
    return {
      id: vendorId,
      type: 'VENDOR' as const,
    };
  }

  const generalContractorId =
    contact.gcLinks.find((link) => link.isPrimary)?.generalContractorId ??
    contact.gcLinks[0]?.generalContractorId ??
    contact.generalContractorId;

  if (generalContractorId) {
    return {
      id: generalContractorId,
      type: 'GC' as const,
    };
  }

  return null;
}

function buildVendorLinks(contact?: Contact): ContactVendorAssociation[] {
  if (!contact) return [];

  const links = contact.vendorLinks.map((link) => ({
    vendorId: link.vendorId,
    isPrimary: link.isPrimary,
    name: contact.vendor?.id === link.vendorId ? contact.vendor.name : undefined,
  }));

  if (contact.vendorId && !links.some((link) => link.vendorId === contact.vendorId)) {
    links.push({
      vendorId: contact.vendorId,
      isPrimary: contact.isPrimary,
      name: contact.vendor?.name,
    });
  }

  return links;
}

function buildGCLinks(contact?: Contact): ContactGCAssociation[] {
  if (!contact) return [];

  const links = contact.gcLinks.map((link) => ({
    generalContractorId: link.generalContractorId,
    isPrimary: link.isPrimary,
    name:
      contact.generalContractor?.id === link.generalContractorId
        ? contact.generalContractor.name
        : undefined,
  }));

  if (
    contact.generalContractorId &&
    !links.some((link) => link.generalContractorId === contact.generalContractorId)
  ) {
    links.push({
      generalContractorId: contact.generalContractorId,
      isPrimary: contact.isPrimary,
      name: contact.generalContractor?.name,
    });
  }

  return links;
}

export type ContactAssociationsState = ReturnType<typeof useContactAssociations>;
