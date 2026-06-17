import { DEV_ACCESS, DEV_AUTH_BYPASS } from '@app/lib/dev-auth-bypass';

import { api } from './client';

export type AppRole = 'dev' | 'admin' | 'accountant' | 'pm' | 'user';
export type ProjectScope = 'all' | 'assigned' | 'none';
export type AccessPermissions = Record<string, readonly string[]>;

export type CurrentAccess = {
  userId: string;
  role: AppRole;
  isDev: boolean;
  isAdmin: boolean;
  employeeId: string | null;
  projectScope: ProjectScope;
  permissions: AccessPermissions;
};

type ApiAccessResponse = {
  data: CurrentAccess;
};

export async function getCurrentAccess(): Promise<CurrentAccess> {
  // Dev-only: grant full access so the sidebar/UI fully populates without a backend.
  if (DEV_AUTH_BYPASS) return DEV_ACCESS;

  const response = await api.get<ApiAccessResponse>('/users/me/access');
  return response.data.data;
}
