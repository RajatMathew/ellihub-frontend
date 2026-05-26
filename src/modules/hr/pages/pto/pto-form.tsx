import { QueryErrorState } from '@/app/components/query-error-state';
import { useBreadcrumbLabel } from '@/app/hooks/use-breadcrumb-label';
import { onInvalidFormSubmit } from '@/app/lib/form-error-toast';
import { PTOFormContent, PTOFormLoading, PTOFormToolbar } from '@/modules/hr/components/pto/form';
import { getPTOEmployeeName, getPTOTypeLabel } from '@/modules/hr/components/pto/shared';
import { usePTOFormState } from '@/modules/hr/hooks/pto/use-pto-form-state';
import { useSavePTO } from '@/modules/hr/hooks/pto/use-save-pto';
import { useParams } from 'react-router-dom';

export default function PTOFormPage() {
  const { id } = useParams<{ id: string }>();
  const {
    isEdit,
    form,
    ptoQuery,
    employeeOptions,
    typeOptions,
    showEmployeeSelector,
    hasCurrentEmployee,
    isEmployeesLoading,
    isAccessLoading,
    isTypesLoading,
  } = usePTOFormState(id);
  const { savePTO, isPending } = useSavePTO({ id, isEdit });
  const isSubmitting = form.formState.isSubmitting || isPending;
  const ptoBreadcrumbLabel = ptoQuery.data
    ? `${getPTOEmployeeName(ptoQuery.data)} - ${getPTOTypeLabel(ptoQuery.data)}`
    : undefined;

  useBreadcrumbLabel(id ? `/app/hr/pto/${id}` : undefined, ptoBreadcrumbLabel ?? 'PTO Request');

  if (isEdit && ptoQuery.isLoading) {
    return <PTOFormLoading />;
  }

  if (isEdit && ptoQuery.isError) {
    return (
      <div className="container-fluid py-7.5">
        <QueryErrorState title="Unable to load request." onRetry={() => void ptoQuery.refetch()} />
      </div>
    );
  }

  return (
    <form
      onSubmit={form.handleSubmit(savePTO, onInvalidFormSubmit)}
      className="container-fluid py-7.5"
    >
      <PTOFormToolbar isEdit={isEdit} isSubmitting={isSubmitting} />
      <PTOFormContent
        control={form.control}
        employeeOptions={employeeOptions}
        typeOptions={typeOptions}
        showEmployeeSelector={showEmployeeSelector}
        hasCurrentEmployee={hasCurrentEmployee}
        isEmployeesLoading={isEmployeesLoading}
        isAccessLoading={isAccessLoading}
        isTypesLoading={isTypesLoading}
      />
    </form>
  );
}
