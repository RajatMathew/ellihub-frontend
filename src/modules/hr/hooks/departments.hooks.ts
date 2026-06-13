import { activityLogKeys } from '@/app/hooks/use-activity-log';
import { toastApiError } from '@/app/lib/toast-api-error';
import { departmentsApi } from '@/modules/hr/api/departments.api';
import { departmentsKeys } from '@/modules/hr/constants/departments.keys';
import type {
  AssignEmployeeInput,
  CreateDepartmentInput,
  ListDepartmentsParams,
  RemoveEmployeeInput,
  UpdateDepartmentInput,
} from '@/modules/hr/schemas/department.schema';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export const useDepartmentsQuery = (params?: ListDepartmentsParams) =>
  useQuery({
    queryKey: departmentsKeys.list(params),
    queryFn: () => departmentsApi.list(params),
  });

export const useDepartmentStatsQuery = () =>
  useQuery({
    queryKey: departmentsKeys.stats(),
    queryFn: () => departmentsApi.stats(),
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
      void qc.invalidateQueries({ queryKey: departmentsKeys.all });
      toast.success('Department created successfully');
    },
    onError: (error) => toastApiError(error, 'Failed to create department.'),
  });
};

export const useUpdateDepartmentMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateDepartmentInput) => departmentsApi.update(data),
    onSuccess: (_, variables) => {
      void qc.invalidateQueries({ queryKey: departmentsKeys.all });
      void qc.invalidateQueries({ queryKey: departmentsKeys.detail(variables.id) });
      void qc.invalidateQueries({ queryKey: activityLogKeys.all });
      toast.success('Department updated successfully');
    },
    onError: (error) => toastApiError(error, 'Failed to update department.'),
  });
};

export const useDeleteDepartmentMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => departmentsApi.remove(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: departmentsKeys.all });
      void qc.invalidateQueries({ queryKey: activityLogKeys.all });
      toast.success('Department deleted successfully');
    },
    onError: (error) => toastApiError(error, 'Failed to delete department.'),
  });
};

export const useAssignEmployeeMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: AssignEmployeeInput) => departmentsApi.assignEmployee(data),
    onSuccess: (_, variables) => {
      void qc.invalidateQueries({ queryKey: departmentsKeys.all });
      void qc.invalidateQueries({ queryKey: departmentsKeys.detail(variables.departmentId) });
      void qc.invalidateQueries({ queryKey: activityLogKeys.all });
      toast.success('Employee assigned successfully');
    },
    onError: (error) => toastApiError(error, 'Failed to assign employee.'),
  });
};

export const useRemoveEmployeeMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: RemoveEmployeeInput) => departmentsApi.removeEmployee(data),
    onSuccess: (_, variables) => {
      void qc.invalidateQueries({ queryKey: departmentsKeys.all });
      void qc.invalidateQueries({ queryKey: departmentsKeys.detail(variables.departmentId) });
      void qc.invalidateQueries({ queryKey: activityLogKeys.all });
      toast.success('Employee removed successfully');
    },
    onError: (error) => toastApiError(error, 'Failed to remove employee.'),
  });
};
