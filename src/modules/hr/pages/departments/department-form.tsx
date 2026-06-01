import { formPageContainerClassName } from '@/app/components/form-page-layout';
import { QueryErrorState } from '@/app/components/query-error-state';
import { useBreadcrumbLabel } from '@/app/hooks/use-breadcrumb-label';
import { onInvalidFormSubmit } from '@/app/lib/form-error-toast';
import {
  DepartmentFormContent,
  DepartmentFormLoading,
  DepartmentFormToolbar,
} from '@/modules/hr/components/departments/form';
import { useDepartmentFormState } from '@/modules/hr/hooks/departments/use-department-form-state';
import { useSaveDepartment } from '@/modules/hr/hooks/departments/use-save-department';
import { useParams } from 'react-router-dom';

export default function DepartmentFormPage() {
  const { id } = useParams<{ id: string }>();
  const { isEdit, form, departmentQuery, activeSection, setActiveSection, fillSample } =
    useDepartmentFormState(id);
  const { saveDepartment, isPending } = useSaveDepartment({ id, isEdit });
  const isSubmitting = form.formState.isSubmitting || isPending;

  useBreadcrumbLabel(
    id ? `/app/hr/departments/${id}` : undefined,
    departmentQuery.data?.name ?? 'Department'
  );

  if (isEdit && departmentQuery.isLoading) {
    return <DepartmentFormLoading />;
  }

  if (isEdit && departmentQuery.isError) {
    return (
      <div className={formPageContainerClassName}>
        <QueryErrorState
          title="Unable to load department."
          onRetry={() => void departmentQuery.refetch()}
        />
      </div>
    );
  }

  return (
    <form
      onSubmit={form.handleSubmit(saveDepartment, onInvalidFormSubmit)}
      className={formPageContainerClassName}
    >
      <DepartmentFormToolbar
        isEdit={isEdit}
        isSubmitting={isSubmitting}
        onFillSample={fillSample}
      />
      <DepartmentFormContent
        activeSection={activeSection}
        control={form.control}
        onSectionChange={setActiveSection}
      />
    </form>
  );
}
