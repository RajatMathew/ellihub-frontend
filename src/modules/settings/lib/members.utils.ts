import type { MemberRole, MemberUser } from '@/modules/settings/schemas/members.schema';

export function normalizeMemberRole(role: string | null | undefined): MemberRole {
  return role?.split(',').map((item) => item.trim()).includes('admin') ? 'admin' : 'user';
}

export function hasAdminRole(role: string | string[] | null | undefined) {
  if (Array.isArray(role)) return role.includes('admin');
  return normalizeMemberRole(role) === 'admin';
}

export function formatMemberDate(value: Date | string | null | undefined) {
  if (!value) return '-';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

export function getMemberInitials(member: Pick<MemberUser, 'name' | 'email'>) {
  const initials = member.name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2);

  return (initials || member.email.slice(0, 2)).toUpperCase();
}

export function generateMemberPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
  const bytes = new Uint32Array(18);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => chars[byte % chars.length]).join('');
}
