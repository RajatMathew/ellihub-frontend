import api from '@/app/api';
import {
  memberUserSchema,
  type MemberCreateInput,
  type MemberPasswordResetInput,
  type MemberSuspendInput,
  type MemberUpdateInput,
  type MemberUser,
  type MembersListParams,
  type MembersListResponse,
  type MemberRole,
} from '@/modules/settings/schemas/members.schema';
import type { AxiosError } from 'axios';

type ApiResponse<T> = {
  data?: T;
  pagination?: {
    currentPage?: number;
    totalPages?: number;
    totalItems?: number;
    itemsPerPage?: number;
  };
  message?: string;
  error?: string;
};

function getApiErrorMessage(error: unknown, fallback: string) {
  const axiosError = error as AxiosError<ApiResponse<unknown>>;
  const responseMessage = axiosError.response?.data?.message || axiosError.response?.data?.error;
  if (responseMessage?.trim()) return responseMessage;
  return error instanceof Error && error.message ? error.message : fallback;
}

function parseApiMember(payload: ApiResponse<unknown>): MemberUser {
  return memberUserSchema.parse(payload.data);
}

function parseApiMembers(payload: ApiResponse<unknown>, fallbackPage: number, fallbackSize: number) {
  const members = memberUserSchema.array().parse(payload.data ?? []);
  const totalItems = payload.pagination?.totalItems ?? members.length;

  return {
    data: members,
    pagination: {
      totalItems,
      totalPages: payload.pagination?.totalPages ?? Math.max(1, Math.ceil(totalItems / fallbackSize)),
      currentPage: payload.pagination?.currentPage ?? fallbackPage,
      pageSize: payload.pagination?.itemsPerPage ?? fallbackSize,
    },
  };
}

export const membersApi = {
  async list(params: MembersListParams): Promise<MembersListResponse> {
    try {
      const response = await api.get<ApiResponse<unknown>>('/users', {
        params: {
          page: params.page,
          size: params.size,
          sortBy: params.sortBy,
          sortOrder: params.sortOrder,
          role: params.role,
          status: params.status,
          emailStatus: params.emailStatus,
          ...(params.search?.trim() ? { search: params.search.trim() } : {}),
        },
      });
      return parseApiMembers(response.data, params.page, params.size);
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'Failed to load members.'));
    }
  },

  async create(input: MemberCreateInput): Promise<MemberUser> {
    try {
      const response = await api.post<ApiResponse<unknown>>('/users', input);
      return parseApiMember(response.data);
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'Failed to create member.'));
    }
  },

  async update(input: MemberUpdateInput): Promise<MemberUser> {
    try {
      const response = await api.put<ApiResponse<unknown>>(`/users/${input.id}`, {
        name: input.name,
        email: input.email,
        role: input.role,
      });
      return parseApiMember(response.data);
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'Failed to update member.'));
    }
  },

  async updateRole(userId: string, role: MemberRole): Promise<MemberUser> {
    try {
      const response = await api.patch<ApiResponse<unknown>>(`/users/${userId}/role`, { role });
      return parseApiMember(response.data);
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'Failed to update member role.'));
    }
  },

  async resetPassword(input: MemberPasswordResetInput): Promise<void> {
    try {
      await api.post(`/users/${input.id}/reset-password`, {
        newPassword: input.newPassword,
        revokeSessions: input.revokeSessions,
      });
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'Failed to reset member password.'));
    }
  },

  async suspend(input: MemberSuspendInput): Promise<MemberUser> {
    try {
      const response = await api.post<ApiResponse<unknown>>(`/users/${input.id}/suspend`, {
        banReason: input.banReason,
        banExpiresIn: input.banExpiresIn,
      });
      return parseApiMember(response.data);
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'Failed to suspend member.'));
    }
  },

  async unsuspend(userId: string): Promise<MemberUser> {
    try {
      const response = await api.post<ApiResponse<unknown>>(`/users/${userId}/unsuspend`);
      return parseApiMember(response.data);
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'Failed to unsuspend member.'));
    }
  },

  async remove(userId: string): Promise<void> {
    try {
      await api.delete(`/users/${userId}`);
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'Failed to remove member.'));
    }
  },
};
