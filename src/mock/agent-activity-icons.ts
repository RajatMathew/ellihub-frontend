import { Building2, FileText, ListTree, Mail, Users, type LucideIcon } from 'lucide-react';

import type { AgentActivityKind } from './agent-activity';

/** The icon each kind of lookup wears on Elliot's step rail. */
export const KIND_ICONS: Record<AgentActivityKind, LucideIcon> = {
  project: Building2,
  record: FileText,
  mail: Mail,
  directory: Users,
  catalog: ListTree,
};
