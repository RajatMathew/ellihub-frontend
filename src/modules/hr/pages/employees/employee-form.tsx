import { useEffect, useRef, useState } from 'react';

import { formPageContainerClassName } from '@/app/components/form-page-layout';
import { FormSectionNav } from '@/app/components/form-section-nav';
import { QueryErrorState } from '@/app/components/query-error-state';
import { useBreadcrumbLabel } from '@/app/hooks/use-breadcrumb-label';
import { onInvalidFormSubmit } from '@/app/lib/form-error-toast';
import { cn } from '@/app/lib/utils';
import {
  EmployeeFormContent,
  EmployeeFormLoading,
  EmployeeFormToolbar,
} from '@/modules/hr/components/employees/form';
import { EMPLOYEE_FORM_SECTIONS } from '@/modules/hr/constants/employees/employee-form.constants';
import { useEmployeeFormState } from '@/modules/hr/hooks/employees/use-employee-form-state';
import { useSaveEmployee } from '@/modules/hr/hooks/employees/use-save-employee';
import { useNavigate, useParams } from 'react-router-dom';

const employeeFormPageClassName = cn(
  formPageContainerClassName,
  'min-h-full overflow-x-visible bg-gray-100 pt-0 lg:pt-0'
);

const employeeFormHeaderClassName =
  'sticky top-0 z-20 -mx-4 border-b border-border bg-background/95 px-4 backdrop-blur-md sm:-mx-6 sm:px-6 lg:-mx-7.5 lg:px-7.5';

const employeeFormToolbarClassName =
  'mx-0 mt-0 mb-0 gap-2 bg-transparent px-0 pt-4 pb-2 lg:mx-0 lg:mt-0 lg:px-0 lg:pt-4 lg:pb-2';

const employeeFormNavClassName =
  'static -mx-4 bg-transparent backdrop-blur-none sm:-mx-6 lg:-mx-7.5';

export default function EmployeeFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const state = useEmployeeFormState(id);
  const { handleSubmit, control } = state.form;
  const headerRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(0);

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

  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;

    const updateHeaderHeight = () => setHeaderHeight(header.offsetHeight);
    updateHeaderHeight();

    const observer = new ResizeObserver(updateHeaderHeight);
    observer.observe(header);

    return () => observer.disconnect();
  }, []);

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
    <form
      onSubmit={handleSubmit(saveEmployee, onInvalidFormSubmit)}
      className={employeeFormPageClassName}
    >
      <div ref={headerRef} className={employeeFormHeaderClassName}>
        <EmployeeFormToolbar
          isEdit={state.isEdit}
          isSubmitting={isSubmitting}
          onFillSample={state.fillSample}
          className={employeeFormToolbarClassName}
        />
        <FormSectionNav
          sections={EMPLOYEE_FORM_SECTIONS}
          activeSection={state.activeSection}
          onSectionChange={state.setActiveSection}
          scrollOffset={headerHeight}
          density="compact"
          appearance="stepper"
          className={employeeFormNavClassName}
        />
      </div>

      <EmployeeFormContent
        control={control}
        isEdit={state.isEdit}
        roleOptions={state.roleOptions}
      />
    </form>
  );
}
