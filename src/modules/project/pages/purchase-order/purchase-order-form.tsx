import { useEffect, useMemo, useRef, useState } from 'react';

import { MockDataButton } from '@/app/components/dev/mock-data-button';
import { Forbidden } from '@/app/components/error/forbidden';
import { FormContent, FormLayout } from '@/app/components/form-layout';
import { useBreadcrumbLabel } from '@/app/hooks/use-breadcrumb-label';
import { onInvalidFormSubmit } from '@/app/lib/form-error-toast';
import { getApiErrorMessage } from '@/app/lib/toast-api-error';
import {
  useVendorDetailQuery,
  useVendorPickerOptions,
  type VendorPickerOption,
} from '@/modules/directory/hooks';
import { filesApi } from '@/modules/files/api/files.api';
import {
  PurchaseOrderFormDetailsCard,
  PurchaseOrderFormLineItemsCard,
} from '@/modules/project/components/purchase-order';
import { calculatePurchaseOrderTotals } from '@/modules/project/components/purchase-order/purchase-order-totals';
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
import {
  resolveProjectEntityFolder,
  useProjectFolderQuery,
} from '@/modules/project/hooks/use-project-folder';
import {
  createPOInputSchema,
  type CreatePOInput,
  type PODetail,
} from '@/modules/project/schemas/purchase-order';
import type { RFQDeliverable, RFQDetail } from '@/modules/project/schemas/rfq';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm } from 'react-hook-form';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

type PurchaseOrderLineItemInput = CreatePOInput['lineItems'][number];

function createDefaultPOValues(projectId: string, rfqId?: string | null): CreatePOInput {
  return {
    projectId,
    vendorId: '',
    rfqId: rfqId || undefined,
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

  return {
    rfqDeliverableId: deliverable.id,
    description: deliverable.name ?? deliverable.description ?? '',
    quantity: quantity > 0 ? quantity : 1,
    unitId: getRFQDeliverableUnitId(deliverable),
    unitPrice: 0,
    costCodeId: deliverable.costCodeId ?? '',
    notes: deliverable.specifications ?? undefined,
  };
}

function getPOFormValues(
  projectId: string,
  po?: PODetail,
  initialRfqId?: string | null,
  tradeCategoryOptions: { value: string; label: string }[] = []
): CreatePOInput {
  if (!po) return createDefaultPOValues(projectId, initialRfqId);

  return {
    projectId: po.projectId,
    vendorId: po.vendorId,
    rfqId: po.rfqId ?? undefined,
    tradeCategoryId: resolvePOTradeCategoryId(po, tradeCategoryOptions),
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

function resolvePOTradeCategoryId(
  po: PODetail,
  tradeCategoryOptions: { value: string; label: string }[]
) {
  const directId = po.tradeCategoryId?.trim();
  if (directId) return directId;

  const candidates = [po.tradeCategoryLabel, po.tradeCategory].filter(
    (value): value is string => typeof value === 'string' && value.trim().length > 0
  );
  const normalizedCandidates = candidates.map((value) => value.trim().toLowerCase());

  return (
    tradeCategoryOptions.find((option) =>
      [option.value, option.label].some((value) =>
        normalizedCandidates.includes(value.trim().toLowerCase())
      )
    )?.value ?? ''
  );
}

function getRFQDeliverableUnitId(deliverable: RFQDeliverable) {
  if (deliverable.unitId) return deliverable.unitId;
  if (typeof deliverable.unit === 'object' && deliverable.unit?.id) return deliverable.unit.id;
  return '';
}

function getAwardedRFQQuote(rfq: RFQDetail) {
  return rfq.quotes.find(
    (quote) => quote.isAwarded || quote.vendorId === rfq.awardedVendorId
  );
}

function getAwardedRFQVendorId(rfq: RFQDetail) {
  const awardedQuote = getAwardedRFQQuote(rfq);
  return rfq.awardedVendorId ?? rfq.awardedVendor?.id ?? awardedQuote?.vendorId ?? '';
}

function getRFQTradeCategoryId(rfq: RFQDetail) {
  return rfq.typeId ?? rfq.type?.id ?? '';
}

function getAwardedQuoteLeadTime(rfq: RFQDetail) {
  const quote = getAwardedRFQQuote(rfq);
  const rawLeadTime =
    (quote as { leadTime?: unknown } | undefined)?.leadTime ?? quote?.leadTimeDays;
  return rawLeadTime == null ? '' : String(rawLeadTime);
}

function getAwardedVendorPaymentTerms(rfq: RFQDetail): CreatePOInput['paymentTerms'] | undefined {
  const vendor = rfq.awardedVendor as {
    paymentTerms?: CreatePOInput['paymentTerms'] | null;
  } | null;
  return vendor?.paymentTerms ?? undefined;
}

export function POFormPage() {
  const { projectId = '', poId } = useParams<{ projectId: string; poId: string }>();
  const isEditMode = !!poId;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialRfqId = !isEditMode ? searchParams.get('rfqId') : null;

  const { data: existingPO, isLoading: isLoadingPO } = usePODetailQuery(poId ?? '');
  useBreadcrumbLabel(
    projectId && poId ? `/app/project/${projectId}/purchase-orders/${poId}` : undefined,
    existingPO?.poNumber ?? undefined
  );
  const { data: project, isLoading: isLoadingProject } = useProjectDetailQuery(projectId);

  const { data: costCodes = [] } = useProjectCostCodesQuery(projectId);
  const { data: rfqsData } = useRFQListQuery({ projectId, size: 100 });
  const { data: tradeCategories } = useLookupsQuery('TRADE_CATEGORY');
  const { data: units } = useLookupsQuery('UNIT');
  const { data: poFolderId } = useProjectFolderQuery(projectId || undefined, 'purchase order');

  const createMutation = useCreatePOMutation();
  const updateMutation = useUpdatePOMutation();
  const addAttachmentMutation = useAddPOAttachmentMutation();
  const [vendorSearch, setVendorSearch] = useState('');

  const costCodeOptions = costCodes.map((costCode) => ({
    value: costCode.id,
    label: `${costCode.code} - ${costCode.name}`,
  }));
  const tradeCategoryOptions = useMemo(
    () =>
      (tradeCategories ?? []).map((category) => ({
        value: category.id,
        label: category.label ?? category.name ?? category.id,
      })),
    [tradeCategories]
  );
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
    defaultValues: getPOFormValues(
      projectId,
      isEditMode ? existingPO : undefined,
      initialRfqId,
      tradeCategoryOptions
    ),
  });
  const { fields, append, remove, replace } = useFieldArray({ control, name: 'lineItems' });
  const selectedRfqId = watch('rfqId');
  const selectedVendorId = watch('vendorId');
  const { data: selectedRfq } = useRFQDetailQuery(selectedRfqId ?? '');
  const { data: selectedVendorDetail } = useVendorDetailQuery(selectedVendorId ?? '');
  const populatedFromRfqId = useRef<string | null>(null);

  const selectedRfqAwardedQuote = selectedRfq?.quotes.find(
    (quote) => quote.isAwarded || quote.vendorId === selectedRfq?.awardedVendorId
  );
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
  const selectedVendorOption = useMemo<VendorPickerOption | undefined>(() => {
    if (selectedRfqAwardedVendorId) {
      return {
        value: selectedRfqAwardedVendorId,
        label: selectedRfqAwardedVendorName ?? selectedRfqAwardedVendorId,
      };
    }

    if (existingPO?.vendorId || existingPO?.vendor?.id) {
      const value = existingPO.vendorId ?? existingPO.vendor?.id ?? '';
      return {
        value,
        label: existingPO.vendor?.name ?? value,
      };
    }

    if (selectedVendorId) {
      return {
        value: selectedVendorId,
        label: selectedVendorDetail?.name ?? selectedVendorId,
      };
    }

    return undefined;
  }, [
    existingPO?.vendor?.id,
    existingPO?.vendor?.name,
    existingPO?.vendorId,
    selectedRfqAwardedVendorId,
    selectedRfqAwardedVendorName,
    selectedVendorDetail?.name,
    selectedVendorId,
  ]);
  const vendorPicker = useVendorPickerOptions({
    search: vendorSearch,
    selectedOptions: selectedVendorOption ? [selectedVendorOption] : [],
    queryScope: 'purchase-order-form-picker',
  });
  const activeVendorOptions = vendorPicker.options.filter((option) => !option.disabled);

  useEffect(() => {
    if (isEditMode && existingPO) {
      reset(getPOFormValues(projectId, existingPO, undefined, tradeCategoryOptions));
    }
  }, [existingPO, isEditMode, projectId, reset, tradeCategoryOptions]);

  useEffect(() => {
    if (!isEditMode || !existingPO) return;

    const tradeCategoryId = resolvePOTradeCategoryId(existingPO, tradeCategoryOptions);
    if (!tradeCategoryId) return;

    const timeoutId = window.setTimeout(() => {
      setValue('tradeCategoryId', tradeCategoryId, {
        shouldDirty: false,
        shouldTouch: false,
        shouldValidate: true,
      });
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [existingPO, isEditMode, setValue, tradeCategoryOptions]);

  useEffect(() => {
    if (isEditMode || !initialRfqId || selectedRfqId === initialRfqId) return;

    setValue('rfqId', initialRfqId, {
      shouldDirty: false,
      shouldValidate: true,
    });
  }, [initialRfqId, isEditMode, selectedRfqId, setValue]);

  useEffect(() => {
    if (!isVendorLocked || !selectedRfqAwardedVendorId) return;

    setValue('vendorId', selectedRfqAwardedVendorId, {
      shouldDirty: true,
      shouldValidate: true,
    });
  }, [isVendorLocked, selectedRfqAwardedVendorId, setValue]);

  useEffect(() => {
    if (isEditMode) return;
    if (!selectedRfqId) {
      populatedFromRfqId.current = null;
      return;
    }
    if (!selectedRfq) return;
    if (getRFQStatusName(selectedRfq) !== 'AWARDED') return;
    if (populatedFromRfqId.current === selectedRfqId) return;

    const awardedVendorId = getAwardedRFQVendorId(selectedRfq);
    if (awardedVendorId) {
      setValue('vendorId', awardedVendorId, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }

    setValue('tradeCategoryId', getRFQTradeCategoryId(selectedRfq), {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue('description', selectedRfq.description ?? selectedRfq.title, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue('leadTime', getAwardedQuoteLeadTime(selectedRfq), {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue('paymentTerms', getAwardedVendorPaymentTerms(selectedRfq) ?? 'NET_30', {
      shouldDirty: true,
      shouldValidate: true,
    });

    const rfqLineItems = selectedRfq.deliverables
      .filter((deliverable) => !deliverable.deletedAt)
      .map(mapRFQDeliverableToPOLineItem)
      .filter((item) => item.description.trim());

    if (rfqLineItems.length) {
      replace(rfqLineItems);
    }

    populatedFromRfqId.current = selectedRfqId;
  }, [isEditMode, replace, selectedRfq, selectedRfqId, setValue]);

  const watchedLineItems = watch('lineItems');
  const watchedNegotiatedDiscount = watch('negotiatedDiscount') ?? 0;
  const watchedShippingHandlingFee = watch('shippingHandlingFee') ?? 0;
  const taxPercent = watch('taxPercent') ?? 0;
  const { subtotal, taxAmount, total } = calculatePurchaseOrderTotals({
    lineItems: watchedLineItems,
    negotiatedDiscount: watchedNegotiatedDiscount,
    shippingHandlingFee: watchedShippingHandlingFee,
    taxPercent,
  });

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

  async function resolvePoUploadFolderId(targetPoId: string): Promise<string | undefined> {
    try {
      return await resolveProjectEntityFolder(projectId, 'PURCHASE_ORDER', targetPoId);
    } catch {
      return poFolderId;
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
          const folderId = await resolvePoUploadFolderId(poId);
          if (folderId) {
            await uploadFilesAndAttach(poId, folderId, selectedFiles);
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
          const folderId = await resolvePoUploadFolderId(created.id);
          if (folderId) {
            await uploadFilesAndAttach(created.id, folderId, selectedFiles);
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
                activeVendorOptions[Math.floor(Math.random() * activeVendorOptions.length)]
                  ?.value ?? '';

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
            vendorOptions={vendorPicker.options}
            vendorSearch={vendorSearch}
            onVendorSearchChange={setVendorSearch}
            isVendorLoading={vendorPicker.isLoading}
            isVendorFetchingNextPage={vendorPicker.isFetchingNextPage}
            hasMoreVendors={vendorPicker.hasNextPage}
            onFetchMoreVendors={vendorPicker.fetchNextPage}
            tradeCategoryOptions={tradeCategoryOptions}
            rfqOptions={rfqOptions}
            isVendorLocked={isVendorLocked}
          />
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
            title="Backup Documents"
            existingTitle="Existing Backup Documents"
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
