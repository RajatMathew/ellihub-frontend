import type {
  MemberEmailStatus,
  MemberRole,
  MembersSortBy,
  MemberStatus,
} from '@/modules/settings/schemas/members.schema';

export const MEMBERS_DEFAULT_PAGE_SIZE = 25;
export const MEMBERS_DEFAULT_SORT_BY: MembersSortBy = 'createdAt';
export const MEMBERS_DEFAULT_SORT_ORDER = 'desc';

export const MEMBERS_SORT_BY_FIELDS: readonly MembersSortBy[] = [
  'name',
  'email',
  'role',
  'emailVerified',
  'banned',
  'createdAt',
];

export const MEMBER_ROLE_LABELS: Record<MemberRole, string> = {
  dev: 'Dev',
  admin: 'Admin',
  accountant: 'Accountant',
  ap: 'A/P',
  pm: 'PM',
  user: 'User',
};

export const MEMBER_STATUS_LABELS: Record<MemberStatus, string> = {
  active: 'Active',
  suspended: 'Suspended',
};

export const MEMBER_EMAIL_STATUS_LABELS: Record<MemberEmailStatus, string> = {
  verified: 'Verified',
  pending: 'Pending',
};
