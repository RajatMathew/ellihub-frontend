import { useCallback } from 'react';

import { useResourceListParams } from '@/app/hooks/use-resource-list-params';
import {
  MEMBERS_DEFAULT_PAGE_SIZE,
  MEMBERS_DEFAULT_SORT_BY,
  MEMBERS_DEFAULT_SORT_ORDER,
  MEMBERS_SEARCH_DEBOUNCE_MS,
  isMembersSortByField,
} from '@/modules/settings/constants/members-list.constants';
import type {
  MemberEmailStatus,
  MemberRole,
  MembersListParams,
  MemberStatus,
} from '@/modules/settings/schemas/members.schema';

function isMemberRole(value: string | null): value is MemberRole {
  return (
    value === 'dev' ||
    value === 'admin' ||
    value === 'accountant' ||
    value === 'pm' ||
    value === 'user'
  );
}

function isMemberStatus(value: string | null): value is MemberStatus {
  return value === 'active' || value === 'suspended';
}

function isMemberEmailStatus(value: string | null): value is MemberEmailStatus {
  return value === 'verified' || value === 'pending';
}

export function useMemberListParams() {
  const listParams = useResourceListParams({
    defaultPageSize: MEMBERS_DEFAULT_PAGE_SIZE,
    defaultSortBy: MEMBERS_DEFAULT_SORT_BY,
    defaultSortOrder: MEMBERS_DEFAULT_SORT_ORDER,
    searchDebounceMs: MEMBERS_SEARCH_DEBOUNCE_MS,
    isSortBy: isMembersSortByField,
  });

  const roleParam = listParams.searchParams.get('role');
  const statusParam = listParams.searchParams.get('status');
  const emailStatusParam = listParams.searchParams.get('emailStatus');
  const roleFilter = isMemberRole(roleParam) ? roleParam : undefined;
  const statusFilter = isMemberStatus(statusParam) ? statusParam : undefined;
  const emailStatusFilter = isMemberEmailStatus(emailStatusParam)
    ? emailStatusParam
    : undefined;

  const params: MembersListParams = {
    page: listParams.page,
    size: listParams.size,
    sortBy: listParams.sortBy,
    sortOrder: listParams.sortOrder,
    search: listParams.searchQuery || undefined,
    role: roleFilter,
    status: statusFilter,
    emailStatus: emailStatusFilter,
  };

  const clearFilters = useCallback(() => {
    listParams.setSearchInput('');
    listParams.updateParams({
      search: undefined,
      role: undefined,
      status: undefined,
      emailStatus: undefined,
      page: undefined,
    });
  }, [listParams]);

  return {
    ...listParams,
    params,
    roleFilter,
    statusFilter,
    emailStatusFilter,
    clearFilters,
  };
}
