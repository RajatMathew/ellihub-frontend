import { MockDataButton } from '@/app/components/dev/mock-data-button';
import { formPageContainerClassName } from '@/app/components/form-page-layout';
import { FormPageShell } from '@/app/components/form-page-shell';
import { FormPageHeader } from '@/app/components/page-header';
import { QueryErrorState } from '@/app/components/query-error-state';
import { useBreadcrumbLabel } from '@/app/hooks/use-breadcrumb-label';
import { onInvalidFormSubmit } from '@/app/lib/form-error-toast';
import { EmployeeFormContent, EmployeeFormLoading } from '@/modules/hr/components/employees/form';
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

  const currentDepartment = state.employeeQuery.data?.department ?? null;

  const { saveEmployee, isSubmitting } = useSaveEmployee({
    id,
    isEdit: state.isEdit,
    originalDepartmentId: state.employeeQuery.data?.departmentId ?? currentDepartment?.id ?? null,
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
        <FormPageHeader
          title={state.isEdit ? 'Update Profile' : 'Add New Employee'}
          submitLabel={state.isEdit ? 'Save Profile' : 'Create Employee'}
          isSubmitting={isSubmitting}
          leadingActions={state.isEdit ? undefined : <MockDataButton onClick={state.fillSample} />}
          className={className}
        />
      )}
    >
      <EmployeeFormContent
        control={control}
        isEdit={state.isEdit}
        roleOptions={state.roleOptions}
        currentDepartment={currentDepartment}
      />
    </FormPageShell>
  );
}
