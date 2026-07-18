export type ContactAssociationType = 'VENDOR' | 'GC';

export interface DirectorySelectOption {
  value: string;
  label: string;
}

export interface ContactVendorAssociation {
  vendorId: string;
  isPrimary: boolean;
  name?: string;
}

export interface ContactGCAssociation {
  generalContractorId: string;
  isPrimary: boolean;
  name?: string;
}

export interface PendingContactAssociation {
  id: string;
  type: ContactAssociationType;
  name?: string;
}

export interface PendingContactUnlink {
  index: number;
  type: ContactAssociationType;
  name: string;
}
