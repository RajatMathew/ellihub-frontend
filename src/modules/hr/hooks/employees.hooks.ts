import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { employeesApi } from '../api/employees.api';
import { employeesKeys } from '../constants/employees.keys';
import type { 
  CreateEmployeeInput, 
  ListEmployeesParams, 
  UpdateEmployeeInput 
} from '../schemas/employee.schema';

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
      toast.success('Employee created successfully');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to create employee');
    },
  });
};

export const useUpdateEmployeeMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateEmployeeInput) => employeesApi.update(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeesKeys.all });
      toast.success('Employee updated successfully');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to update employee');
    },
  });
};

export const useDeleteEmployeeMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => employeesApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeesKeys.lists() });
      toast.success('Employee deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to delete employee');
    },
  });
};
