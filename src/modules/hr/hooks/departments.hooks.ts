import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { departmentsApi } from '@modules/hr/api/departments.api';
import { departmentsKeys } from '@modules/hr/constants/departments.keys';
import type {
  CreateDepartmentInput,
  ListDepartmentsParams,
  UpdateDepartmentInput,
  AssignEmployeeInput,
  RemoveEmployeeInput,
} from '@modules/hr/schemas/department.schema';

/* ---- queries ---- */

export const useDepartmentsQuery = (params?: ListDepartmentsParams) =>
  useQuery({
    queryKey: [...departmentsKeys.list(), params],
    queryFn: () => departmentsApi.list(params),
  });

export const useDepartmentDetailQuery = (id: string) =>
  useQuery({
    queryKey: departmentsKeys.detail(id),
    queryFn: () => departmentsApi.getById(id),
    enabled: !!id,
  });

/* ---- mutations ---- */

export const useCreateDepartmentMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateDepartmentInput) => departmentsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: departmentsKeys.all });
      toast.success('Department created successfully');
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Failed to create department.';
      toast.error(msg);
    },
  });
};

export const useUpdateDepartmentMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateDepartmentInput) => departmentsApi.update(data),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: departmentsKeys.all });
      qc.invalidateQueries({ queryKey: departmentsKeys.detail(variables.id) });
      toast.success('Department updated successfully');
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Failed to update department.';
      toast.error(msg);
    },
  });
};

export const useDeleteDepartmentMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => departmentsApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: departmentsKeys.all });
      toast.success('Department deleted successfully');
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Failed to delete department.';
      toast.error(msg);
    },
  });
};

export const useAssignEmployeeMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: AssignEmployeeInput) => departmentsApi.assignEmployee(data),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: departmentsKeys.detail(variables.departmentId) });
      toast.success('Employee assigned successfully');
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Failed to assign employee.';
      toast.error(msg);
    },
  });
};

export const useRemoveEmployeeMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: RemoveEmployeeInput) => departmentsApi.removeEmployee(data),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: departmentsKeys.detail(variables.departmentId) });
      toast.success('Employee removed successfully');
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Failed to remove employee.';
      toast.error(msg);
    },
  });
};
