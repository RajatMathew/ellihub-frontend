import { useEffect, useRef, useState } from 'react';

import { MockDataButton } from '@/app/components/dev/mock-data-button';
import { Forbidden } from '@/app/components/error/forbidden';
import { FormContent, FormLayout } from '@/app/components/form-layout';
import { useBreadcrumbLabel } from '@/app/hooks/use-breadcrumb-label';
import { onInvalidFormSubmit } from '@/app/lib/form-error-toast';
import { getApiErrorMessage } from '@/app/lib/toast-api-error';
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
  ProjectFormShell,
} from '@/modules/project/components/shared';
import { PO_FORM_SECTIONS } from '@/modules/project/constants/purchase-order';
import poMockData from '@/modules/project/constants/purchase-order/purchase-order-create.mock.json';
import {
  useProjectCostCodesQuery,
  useProjectDetailQuery,
  useRFQDetailQuery,
  useRFQListQuery,
} from '@/modules/project/hooks';
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
import type { RFQDeliverable } from '@/modules/project/schemas/rfq';
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
    negotiatedDiscount: 0,
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

function mapRFQDeliverableToPOLineItem(deliverable: RFQDeliverable): PurchaseOrderLineItemInput {
  const quantity = Number(deliverable.quantity ?? 0);
  const estimatedUnitPrice =
    deliverable.estimatedUnitPrice ??
    (deliverable.estimatedTotal != null && quantity > 0
      ? deliverable.estimatedTotal / quantity
      : 0);

  return {
    description: deliverable.description ?? deliverable.name ?? '',
    quantity: quantity > 0 ? quantity : 1,
    unitId: deliverable.unitId ?? '',
    unitPrice: Number(estimatedUnitPrice ?? 0),
    costCodeId: deliverable.costCodeId ?? '',
    notes: deliverable.specifications ?? undefined,
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
    negotiatedDiscount: Number(po.negotiatedDiscount ?? 0),
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
  const { data: project, isLoading: isLoadingProject } = useProjectDetailQuery(projectId);

  const { data: vendorsData } = useVendorsQuery({ limit: 1000 });
  const { data: costCodes = [] } = useProjectCostCodesQuery(projectId);
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
  const costCodeOptions = costCodes.map((costCode) => ({
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

  const { control, handleSubmit, formState, reset, setValue, watch } = useForm<CreatePOInput>({
    resolver: zodResolver(createPOInputSchema),
    defaultValues: getPOFormValues(projectId, isEditMode ? existingPO : undefined),
  });
  const { fields, append, remove, replace } = useFieldArray({ control, name: 'lineItems' });
  const selectedRfqId = watch('rfqId');
  const { data: selectedRfq } = useRFQDetailQuery(selectedRfqId ?? '');
  const populatedLineItemsFromRfqId = useRef<string | null>(null);

  const selectedRfqAwardedQuote = selectedRfq?.quotes.find((quote) => quote.isAwarded);
  const selectedRfqAwardedVendorId =
    selectedRfq?.awardedVendorId ??
    selectedRfq?.awardedVendor?.id ??
    selectedRfqAwardedQuote?.vendorId ??
    selectedRfqAwardedQuote?.vendor?.id;
  const selectedRfqAwardedVendorName =
    selectedRfq?.awardedVendor?.name ?? selectedRfqAwardedQuote?.vendor?.name;
  const isAwardedRfqSelected =
    !!selectedRfqId && (selectedRfq ? getRFQStatusName(selectedRfq) === 'AWARDED' : true);
  const isVendorLocked = isAwardedRfqSelected;
  const effectiveVendorOptions =
    selectedRfqAwardedVendorName &&
    selectedRfqAwardedVendorId &&
    !vendorOptions.some((option) => option.value === selectedRfqAwardedVendorId)
      ? [
          ...vendorOptions,
          {
            value: selectedRfqAwardedVendorId,
            label: selectedRfqAwardedVendorName,
          },
        ]
      : vendorOptions;

  useEffect(() => {
    if (isEditMode && existingPO) {
      reset(getPOFormValues(projectId, existingPO));
    }
  }, [existingPO, isEditMode, projectId, reset]);

  useEffect(() => {
    if (!isVendorLocked || !selectedRfqAwardedVendorId) return;

    setValue('vendorId', selectedRfqAwardedVendorId, {
      shouldDirty: true,
      shouldValidate: true,
    });
  }, [isVendorLocked, selectedRfqAwardedVendorId, setValue]);

  useEffect(() => {
    if (isEditMode || !selectedRfqId || !selectedRfq) return;
    if (populatedLineItemsFromRfqId.current === selectedRfqId) return;

    const rfqLineItems = selectedRfq.deliverables
      .filter((deliverable) => !deliverable.deletedAt)
      .map(mapRFQDeliverableToPOLineItem)
      .filter((item) => item.description.trim());

    if (!rfqLineItems.length) return;

    replace(rfqLineItems);
    populatedLineItemsFromRfqId.current = selectedRfqId;
  }, [isEditMode, replace, selectedRfq, selectedRfqId]);

  const watchedLineItems = watch('lineItems');
  const subtotal = (watchedLineItems ?? []).reduce(
    (sum, item) => sum + (item.quantity ?? 0) * (item.unitPrice ?? 0),
    0
  );
  const watchedNegotiatedDiscount = watch('negotiatedDiscount') ?? 0;
  const watchedShippingHandlingFee = watch('shippingHandlingFee') ?? 0;
  const taxPercent = watch('taxPercent') ?? 0;
  const discount = Math.min(Math.max(watchedNegotiatedDiscount, 0), subtotal);
  const taxableSubtotal = Math.max(subtotal - discount, 0);
  const taxAmount = (taxableSubtotal * taxPercent) / 100;
  const total = taxableSubtotal + watchedShippingHandlingFee + taxAmount;

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
      } catch (error) {
        toast.error(getApiErrorMessage(error, `Failed to upload ${file.name}.`));
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
      negotiatedDiscount: rest.negotiatedDiscount || undefined,
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

  if ((isEditMode && isLoadingPO) || isLoadingProject) {
    return <ProjectFormPageLoading sections={PO_FORM_SECTIONS.length} />;
  }

  const canSubmitPurchaseOrder = isEditMode
    ? project?.capabilities?.actions?.purchaseOrder?.update === true
    : project?.capabilities?.actions?.purchaseOrder?.create === true;
  if (!canSubmitPurchaseOrder) return <Forbidden />;

  return (
    <ProjectFormShell
      formKey={isEditMode ? (existingPO?.id ?? 'loading') : 'create'}
      onSubmit={(event) => void handleSubmit(onSubmit, onInvalidFormSubmit)(event)}
      title={isEditMode ? 'Edit Purchase Order' : 'New Purchase Order'}
      submitLabel={isEditMode ? 'Save Changes' : 'Create PO'}
      isSubmitting={isSubmitting}
      sections={PO_FORM_SECTIONS}
      activeSection={activeSection}
      onSectionChange={setActiveSection}
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
                  unitId: unitOptions[Math.floor(Math.random() * unitOptions.length)]?.value ?? '',
                  costCodeId:
                    costCodeOptions[Math.floor(Math.random() * costCodeOptions.length)]?.value ??
                    undefined,
                })),
              });
            }}
          />
        ) : null
      }
    >
      <FormLayout className="pt-4 pb-8 lg:pb-10">
        <FormContent>
          <PurchaseOrderFormDetailsCard
            control={control}
            vendorOptions={effectiveVendorOptions}
            tradeCategoryOptions={tradeCategoryOptions}
            rfqOptions={rfqOptions}
            isVendorLocked={isVendorLocked}
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
    </ProjectFormShell>
  );
}
