import type { MembersListParams } from '@/modules/settings/schemas/members.schema';

export const membersKeys = {
  all: ['settings', 'members'] as const,
  lists: () => [...membersKeys.all, 'list'] as const,
  list: (params: MembersListParams) => [...membersKeys.lists(), params] as const,
};

