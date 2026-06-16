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
  const response = await api.get<ApiAccessResponse>('/users/me/access');
  return response.data.data;
}
