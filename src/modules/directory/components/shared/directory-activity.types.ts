import type { ReactNode } from 'react';

export interface DirectoryActivityItem {
  id: string;
  user: string;
  action: string;
  timestamp: string;
  icon: ReactNode;
  toneClassName: string;
}
