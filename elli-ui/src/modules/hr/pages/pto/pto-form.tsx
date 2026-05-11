import { QueryErrorState } from '@/app/components/query-error-state';
import { PTOFormContent, PTOFormLoading, PTOFormToolbar } from '@/modules/hr/components/pto/form';
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
    isEmployeesLoading,
    isTypesLoading,
  } = usePTOFormState(id);
  const { savePTO, isPending } = useSavePTO({ id, isEdit });
  const isSubmitting = form.formState.isSubmitting || isPending;

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
    <form onSubmit={form.handleSubmit(savePTO)} className="container-fluid py-7.5">
      <PTOFormToolbar isEdit={isEdit} isSubmitting={isSubmitting} />
      <PTOFormContent
        control={form.control}
        employeeOptions={employeeOptions}
        typeOptions={typeOptions}
        isEmployeesLoading={isEmployeesLoading}
        isTypesLoading={isTypesLoading}
      />
    </form>
  );
}
