import { toastApiError } from '@/app/lib/toast-api-error';
import { employeesApi } from '@/modules/hr/api/employees.api';
import { employeesKeys } from '@/modules/hr/constants/employees.keys';
import type {
  CreateEmployeeInput,
  ListEmployeesParams,
  UpdateEmployeeInput,
} from '@/modules/hr/schemas/employee.schema';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export const useEmployeesQuery = (params: ListEmployeesParams) => {
  return useQuery({
    queryKey: employeesKeys.list(params),
    queryFn: () => employeesApi.list(params),
  });
};

export const useEmployeeDetailQuery = (id: string) => {
  return useQuery({
    queryKey: employeesKeys.detail(id),
    queryFn: () => employeesApi.getById(id),
    enabled: !!id,
  });
};

export const useEmployeeProjectsQuery = (id: string) => {
  return useQuery({
    queryKey: employeesKeys.projects(id),
    queryFn: () => employeesApi.getProjects(id),
    enabled: !!id,
  });
};

export const useCreateEmployeeMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateEmployeeInput) => employeesApi.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeesKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: employeesKeys.all });
    },
    onError: (error) => toastApiError(error, 'Failed to create employee.'),
  });
};

export const useUpdateEmployeeMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateEmployeeInput) => employeesApi.update(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeesKeys.all });
    },
    onError: (error) => toastApiError(error, 'Failed to update employee.'),
  });
};

export const useDeleteEmployeeMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => employeesApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeesKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: employeesKeys.all });
    },
    onError: (error) => toastApiError(error, 'Failed to delete employee.'),
  });
};

export const useAddEmployeeDocumentMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      employeeId,
      fileId,
      expiresOn,
    }: {
      employeeId: string;
      fileId: string;
      expiresOn?: string;
    }) => employeesApi.addDocument(employeeId, fileId, expiresOn),
    onSuccess: (_, { employeeId }) => {
      queryClient.invalidateQueries({ queryKey: employeesKeys.detail(employeeId) });
    },
    onError: (error) => toastApiError(error, 'Failed to link document.'),
  });
};

export const useRemoveEmployeeDocumentMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ employeeId, fileId }: { employeeId: string; fileId: string }) =>
      employeesApi.removeDocument(employeeId, fileId),
    onSuccess: (_, { employeeId }) => {
      queryClient.invalidateQueries({ queryKey: employeesKeys.detail(employeeId) });
    },
    onError: (error) => toastApiError(error, 'Failed to unlink document.'),
  });
};
