import { formPageContainerClassName } from '@/app/components/form-page-layout';
import { FormPageShell } from '@/app/components/form-page-shell';
import { QueryErrorState } from '@/app/components/query-error-state';
import { useBreadcrumbLabel } from '@/app/hooks/use-breadcrumb-label';
import { onInvalidFormSubmit } from '@/app/lib/form-error-toast';
import {
  EmployeeFormContent,
  EmployeeFormLoading,
  EmployeeFormToolbar,
} from '@/modules/hr/components/employees/form';
import { EMPLOYEE_FORM_SECTIONS } from '@/modules/hr/constants/employees/employee-form.constants';
import { useEmployeeFormState } from '@/modules/hr/hooks/employees/use-employee-form-state';
import { useSaveEmployee } from '@/modules/hr/hooks/employees/use-save-employee';
import { useNavigate, useParams } from 'react-router-dom';

export default function EmployeeFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const state = useEmployeeFormState(id);
  const { handleSubmit, control } = state.form;

  useBreadcrumbLabel(
    id ? `/app/hr/employees/${id}` : undefined,
    state.employeeQuery.data?.name ?? 'Employee'
  );

  const { saveEmployee, isSubmitting } = useSaveEmployee({
    id,
    isEdit: state.isEdit,
    onSaved: (createdId) => {
      if (createdId) {
        navigate(`../${createdId}`, { relative: 'path' });
        return;
      }
      navigate('..', { relative: 'path' });
    },
  });

  if (state.isEdit && state.employeeQuery.isLoading) {
    return <EmployeeFormLoading />;
  }

  if (state.isEdit && state.employeeQuery.isError) {
    return (
      <div className={formPageContainerClassName}>
        <QueryErrorState
          title="Unable to load employee."
          description="The employee profile could not be loaded."
          onRetry={() => void state.employeeQuery.refetch()}
        />
      </div>
    );
  }

  if (state.isEdit && !state.employeeQuery.data) {
    return (
      <div className={formPageContainerClassName}>
        <QueryErrorState
          title="Employee record not found."
          description="This employee may have been deleted or moved."
          onRetry={() => void state.employeeQuery.refetch()}
        />
      </div>
    );
  }

  return (
    <FormPageShell
      onSubmit={handleSubmit(saveEmployee, onInvalidFormSubmit)}
      sections={EMPLOYEE_FORM_SECTIONS}
      activeSection={state.activeSection}
      onSectionChange={state.setActiveSection}
      renderToolbar={(className) => (
        <EmployeeFormToolbar
          isEdit={state.isEdit}
          isSubmitting={isSubmitting}
          onFillSample={state.fillSample}
          className={className}
        />
      )}
    >
      <EmployeeFormContent
        control={control}
        isEdit={state.isEdit}
        roleOptions={state.roleOptions}
      />
    </FormPageShell>
  );
}
