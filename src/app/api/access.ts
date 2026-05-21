import { api } from './client';

export type AppRole = 'admin' | 'user';
export type ProjectScope = 'all' | 'assigned' | 'none';
export type AccessPermissions = Record<string, readonly string[]>;

export type CurrentAccess = {
  userId: string;
  role: AppRole;
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
