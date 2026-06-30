import { createContext } from 'react';

export interface BreadcrumbLabelsContextValue {
  labels: Record<string, string>;
  setLabel: (path: string, label?: string) => void;
}

export const BreadcrumbLabelsContext = createContext<BreadcrumbLabelsContextValue | undefined>(
  undefined,
);
