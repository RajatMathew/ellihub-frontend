import {
  Building2,
  FileDiff,
  FileSearch,
  Receipt,
  ShoppingCart,
  type LucideIcon,
} from 'lucide-react';
import type { RecordMentionKind } from './agent-mentions';

/** One icon per record kind, shared by the @ menu and the pills. */
export const RECORD_KIND_ICONS: Record<RecordMentionKind, LucideIcon> = {
  project: Building2,
  rfq: FileSearch,
  purchaseOrder: ShoppingCart,
  subChangeOrder: FileDiff,
  invoice: Receipt,
};
