export type ContactAssociationType = 'VENDOR' | 'GC';

export interface DirectorySelectOption {
  value: string;
  label: string;
}

export interface ContactVendorAssociation {
  vendorId: string;
  isPrimary: boolean;
}

export interface ContactGCAssociation {
  generalContractorId: string;
  isPrimary: boolean;
}

export interface PendingContactAssociation {
  id: string;
  type: ContactAssociationType;
}

export interface PendingContactUnlink {
  index: number;
  type: ContactAssociationType;
  name: string;
}
