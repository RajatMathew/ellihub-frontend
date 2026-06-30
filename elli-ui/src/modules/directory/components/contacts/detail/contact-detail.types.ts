import type { ReactNode } from 'react';

export type ContactEntityType = 'VENDOR' | 'GC';

export interface ContactEntityLink {
  id: string;
  name: string;
  entityType: ContactEntityType;
  isPrimary?: boolean;
  vendorId?: string;
  generalContractorId?: string;
}

export interface ContactActivityItem {
  id: string;
  user: string;
  action: string;
  timestamp: string;
  icon: ReactNode;
  toneClassName: string;
}
