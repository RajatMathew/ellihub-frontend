import { useEffect, useState } from 'react';

import { MockDataButton } from '@/app/components/dev/mock-data-button';
import { FormContent, FormLayout } from '@/app/components/form-layout';
import { FormSectionNav } from '@/app/components/form-section-nav';
import { useBreadcrumbLabel } from '@/app/hooks/use-breadcrumb-label';
import { onInvalidFormSubmit } from '@/app/lib/form-error-toast';
import { useCostCodesQuery } from '@/modules/catalog/hooks';
import { useVendorsQuery } from '@/modules/directory/hooks';
import { filesApi } from '@/modules/files/api/files.api';
import {
  PurchaseOrderFormDetailsCard,
  PurchaseOrderFormFinancialCard,
  PurchaseOrderFormLineItemsCard,
} from '@/modules/project/components/purchase-order';
import { getRFQStatusName } from '@/modules/project/components/rfq';
import {
  ProjectFormDocumentsCard,
  ProjectFormPageLoading,
  ProjectFormToolbar,
} from '@/modules/project/components/shared';
import { PO_FORM_SECTIONS } from '@/modules/project/constants/purchase-order';
import poMockData from '@/modules/project/constants/purchase-order/purchase-order-create.mock.json';
import { useRFQListQuery } from '@/modules/project/hooks';
import { useLookupsQuery } from '@/modules/project/hooks/lookup.hooks';
import {
  useAddPOAttachmentMutation,
  useCreatePOMutation,
  usePODetailQuery,
  useUpdatePOMutation,
} from '@/modules/project/hooks/purchase-order';
import { useProjectFolderQuery } from '@/modules/project/hooks/use-project-folder';
import {
  createPOInputSchema,
  type CreatePOInput,
  type PODetail,
} from '@/modules/project/schemas/purchase-order';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

type PurchaseOrderLineItemInput = CreatePOInput['lineItems'][number];

function createDefaultPOValues(projectId: string): CreatePOInput {
  return {
    projectId,
    vendorId: '',
    rfqId: undefined,
    tradeCategoryId: '',
    description: '',
    leadTime: '',
    expectedDate: '',
    shipToAddress: '',
    address: '',
    shippingHandlingFee: 0,
    taxPercent: 0,
    paymentTerms: 'NET_30',
    retainagePercent: 10,
    notes: '',
    lineItems: [{ description: '', quantity: 1, unitId: '', unitPrice: 0, costCodeId: '' }],
  };
}

function mapPOLineItemToInput(item: PODetail['lineItems'][number]): PurchaseOrderLineItemInput {
  return {
    description: item.description,
    quantity: Number(item.quantity),
    unitId: item.unitId ?? '',
    unitPrice: Number(item.unitPrice),
    costCodeId: item.costCodeId ?? '',
    notes: item.notes ?? undefined,
  };
}

function getPOFormValues(projectId: string, po?: PODetail): CreatePOInput {
  if (!po) return createDefaultPOValues(projectId);

  return {
    projectId: po.projectId,
    vendorId: po.vendorId,
    rfqId: po.rfqId ?? undefined,
    tradeCategoryId: po.tradeCategoryId ?? '',
    description: po.description ?? '',
    leadTime: po.leadTime ?? '',
    expectedDate: po.expectedDate?.split('T')[0] ?? '',
    shipToAddress: po.shipToAddress ?? '',
    address: po.address ?? '',
    shippingHandlingFee: Number(po.shippingHandlingFee ?? 0),
    taxPercent: Number(po.taxPercent) || 0,
    paymentTerms: po.paymentTerms ?? 'NET_30',
    retainagePercent: Number(po.retainagePercent) || 10,
    notes: po.notes ?? '',
    lineItems:
      po.lineItems.length > 0
        ? po.lineItems.map(mapPOLineItemToInput)
        : [{ description: '', quantity: 1, unitId: '', unitPrice: 0, costCodeId: '' }],
  };
}

export function POFormPage() {
  const { projectId = '', poId } = useParams<{ projectId: string; poId: string }>();
  const isEditMode = !!poId;
  const navigate = useNavigate();

  const { data: existingPO, isLoading: isLoadingPO } = usePODetailQuery(poId ?? '');
  useBreadcrumbLabel(
    projectId && poId ? `/app/project/${projectId}/purchase-orders/${poId}` : undefined,
    existingPO?.poNumber ?? undefined
  );

  const { data: vendorsData } = useVendorsQuery({ limit: 1000 });
  const { data: costCodesData } = useCostCodesQuery();
  const { data: rfqsData } = useRFQListQuery({ projectId, size: 100 });
  const { data: tradeCategories } = useLookupsQuery('TRADE_CATEGORY');
  const { data: units } = useLookupsQuery('UNIT');
  const { data: poFolderId } = useProjectFolderQuery(projectId || undefined, 'purchase order');

  const createMutation = useCreatePOMutation();
  const updateMutation = useUpdatePOMutation();
  const addAttachmentMutation = useAddPOAttachmentMutation();

  const vendorOptions = (vendorsData?.data ?? []).map((vendor) => ({
    value: vendor.id,
    label: vendor.name,
  }));
  const costCodeOptions = (costCodesData?.data ?? []).map((costCode) => ({
    value: costCode.id,
    label: `${costCode.code} - ${costCode.name}`,
  }));
  const tradeCategoryOptions = (tradeCategories ?? []).map((category) => ({
    value: category.id,
    label: category.label ?? category.name ?? category.id,
  }));
  const unitOptions = (units ?? []).map((unit) => ({
    value: unit.id,
    label: unit.label ?? unit.name ?? unit.id,
  }));
  const rfqOptions = (rfqsData?.data ?? [])
    .filter((rfq) => getRFQStatusName(rfq) === 'AWARDED')
    .map((rfq) => ({
      value: rfq.id,
      label: rfq.rfqNumber ?? rfq.title,
    }));

  const { control, handleSubmit, formState, reset, watch } = useForm<CreatePOInput>({
    resolver: zodResolver(createPOInputSchema),
    defaultValues: getPOFormValues(projectId, isEditMode ? existingPO : undefined),
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'lineItems' });

  useEffect(() => {
    if (isEditMode && existingPO) {
      reset(getPOFormValues(projectId, existingPO));
    }
  }, [existingPO, isEditMode, projectId, reset]);

  const watchedLineItems = watch('lineItems');
  const subtotal = (watchedLineItems ?? []).reduce(
    (sum, item) => sum + (item.quantity ?? 0) * (item.unitPrice ?? 0),
    0
  );
  const watchedShippingHandlingFee = watch('shippingHandlingFee') ?? 0;
  const taxPercent = watch('taxPercent') ?? 0;
  const taxAmount = (subtotal * taxPercent) / 100;
  const total = subtotal + watchedShippingHandlingFee + taxAmount;

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('po-details');
  const isSubmitting = isSaving || createMutation.isPending || updateMutation.isPending;

  async function uploadFilesAndAttach(targetPoId: string, folderId: string, files: File[]) {
    for (const file of files) {
      try {
        const uploaded = await filesApi.uploadFile(file, {
          name: file.name,
          parentId: folderId,
          mimeType: file.type || undefined,
          size: file.size,
        });
        await addAttachmentMutation.mutateAsync({
          poId: targetPoId,
          data: { documentId: uploaded.id },
        });
      } catch {
        toast.error(`Failed to upload ${file.name}.`);
      }
    }
  }

  const onSubmit = async (formData: CreatePOInput) => {
    const { lineItems, ...rest } = formData;
    const cleaned: CreatePOInput = {
      ...rest,
      rfqId: rest.rfqId || undefined,
      description: rest.description || undefined,
      leadTime: rest.leadTime || undefined,
      expectedDate: rest.expectedDate || undefined,
      shipToAddress: rest.shipToAddress || undefined,
      address: rest.address || undefined,
      notes: rest.notes || undefined,
      shippingHandlingFee: rest.shippingHandlingFee || undefined,
      taxPercent: rest.taxPercent ?? undefined,
      retainagePercent: rest.retainagePercent ?? undefined,
      lineItems: lineItems.map((item) => ({
        ...item,
        costCodeId: item.costCodeId,
        notes: item.notes || undefined,
      })),
    };

    if (isEditMode && poId && existingPO) {
      setIsSaving(true);
      try {
        await updateMutation.mutateAsync({ id: poId, data: cleaned });

        if (selectedFiles.length > 0) {
          if (poFolderId) {
            await uploadFilesAndAttach(poId, poFolderId, selectedFiles);
          } else {
            toast.error('PO folder not found - files were not uploaded.');
          }
        }

        navigate('..', { relative: 'path' });
      } catch {
        // Mutation onError handlers surface the toast.
      } finally {
        setIsSaving(false);
      }
      return;
    }

    createMutation.mutate(cleaned, {
      onSuccess: async (created) => {
        if (selectedFiles.length > 0) {
          if (poFolderId) {
            await uploadFilesAndAttach(created.id, poFolderId, selectedFiles);
          } else {
            toast.error('PO folder not found - files were not uploaded.');
          }
        }
        navigate(`../${created.id}`, { relative: 'path' });
      },
    });
  };

  if (isEditMode && isLoadingPO) {
    return <ProjectFormPageLoading sections={PO_FORM_SECTIONS.length} />;
  }

  return (
    <form
      key={isEditMode ? (existingPO?.id ?? 'loading') : 'create'}
      onSubmit={(event) =>
        void handleSubmit(onSubmit, onInvalidFormSubmit)(event)
      }
      className="container-fluid max-w-full overflow-x-hidden px-4 py-5 sm:px-6 lg:px-7.5 lg:py-7.5"
    >
      <ProjectFormToolbar
        backLabel="Purchase Orders"
        title={isEditMode ? 'Edit Purchase Order' : 'New Purchase Order'}
        description={
          isEditMode
            ? `Editing ${existingPO?.poNumber ?? 'PO'}`
            : 'Create a new purchase order with line items.'
        }
        submitLabel={isEditMode ? 'Save Changes' : 'Create PO'}
        isSubmitting={isSubmitting}
        extraActions={
          !isEditMode ? (
            <MockDataButton
              data={poMockData}
              onLoad={(entries) => {
                const data = entries[Math.floor(Math.random() * entries.length)];
                const randomVendor =
                  vendorOptions[Math.floor(Math.random() * vendorOptions.length)]?.value ?? '';

                reset({
                  ...data,
                  projectId,
                  vendorId: randomVendor,
                  paymentTerms: (data.paymentTerms ?? 'NET_30') as CreatePOInput['paymentTerms'],
                  tradeCategoryId:
                    tradeCategoryOptions[Math.floor(Math.random() * tradeCategoryOptions.length)]
                      ?.value ?? '',
                  lineItems: data.lineItems.map((item) => ({
                    ...item,
                    unitId:
                      unitOptions[Math.floor(Math.random() * unitOptions.length)]?.value ?? '',
                    costCodeId:
                      costCodeOptions[Math.floor(Math.random() * costCodeOptions.length)]?.value ??
                      undefined,
                  })),
                });
              }}
            />
          ) : null
        }
      />

      <FormLayout>
        <FormSectionNav
          sections={PO_FORM_SECTIONS}
          activeSection={activeSection}
          onSectionChange={setActiveSection}
        />

        <FormContent>
          <PurchaseOrderFormDetailsCard
            control={control}
            vendorOptions={vendorOptions}
            tradeCategoryOptions={tradeCategoryOptions}
            rfqOptions={rfqOptions}
          />
          <PurchaseOrderFormFinancialCard control={control} />
          <PurchaseOrderFormLineItemsCard
            control={control}
            fields={fields}
            append={append}
            remove={remove}
            costCodeOptions={costCodeOptions}
            unitOptions={unitOptions}
            rootError={formState.errors.lineItems}
            subtotal={subtotal}
            taxPercent={taxPercent}
            taxAmount={taxAmount}
            total={total}
          />
          <ProjectFormDocumentsCard
            selectedFiles={selectedFiles}
            existingDocuments={isEditMode ? existingPO?.attachments : undefined}
            onAddFile={(file) => setSelectedFiles((prev) => [...prev, file])}
            onRemoveFile={(index) =>
              setSelectedFiles((prev) => prev.filter((_, currentIndex) => currentIndex !== index))
            }
          />
        </FormContent>
      </FormLayout>
    </form>
  );
}
