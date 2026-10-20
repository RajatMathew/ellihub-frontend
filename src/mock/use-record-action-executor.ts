import { useCallback } from 'react';

import { emailApi } from '@/modules/email/api';
import { filesApi, type ProjectEntityFolderType } from '@/modules/files/api/files.api';
import { useUploadManager } from '@/modules/files/uploads/upload-manager-context';
import {
  useAwardRFQMutation,
  useCreateInvoiceMutation,
  useCreateRFQMutation,
  useCreateSCOMutation,
} from '@/modules/project/hooks';
import {
  useCreatePOMutation,
  useIssuePOMutation,
} from '@/modules/project/hooks/purchase-order/purchase-order.hooks';

import {
  recordActionAttachments,
  recordAttachmentName,
  toCreateInvoiceInput,
  toCreatePoInput,
  toCreateRfqInput,
  toCreateScoInput,
  type RecordAgentAction,
  type RecordAttachment,
} from './record-actions';

/** What an approved record action reports back to Elliot and the user. */
export type RecordActionResult = {
  output: string;
  /** Set when the record exists but a file could not be filed with it. */
  warning?: string;
};

/**
 * Runs an approved record proposal through the same mutations the record pages
 * use, so the caches they invalidate and the toasts they show are the pages'
 * own.
 *
 * RFQs, POs and change orders are created first and their files uploaded into
 * the record's own folder afterwards, where the upload links them. A failed
 * upload then leaves a record without its file rather than no record — the
 * result says so, and it is reported as a success so Elliot does not propose
 * the record a second time. An invoice cannot be created without its file, so
 * that file goes up first, into the project's invoice folder, the way the
 * invoice form does it.
 */
export function useRecordActionExecutor(fallbackAccountId: string | undefined) {
  const uploadManager = useUploadManager();
  const createRfq = useCreateRFQMutation();
  const awardRfq = useAwardRFQMutation();
  const createPo = useCreatePOMutation();
  const issuePo = useIssuePOMutation();
  const createSco = useCreateSCOMutation();
  const createInvoice = useCreateInvoiceMutation();

  const toFile = useCallback(
    async (attachment: RecordAttachment): Promise<File> => {
      if (attachment.source === 'local_file') return attachment.file;
      const accountId = attachment.accountId ?? fallbackAccountId;
      if (!accountId) throw new Error('Connect a mailbox before attaching an email file.');
      const blob = await emailApi.getAttachment(
        accountId,
        attachment.messageId,
        attachment.attachmentId
      );
      return new File([blob], attachment.attachmentName, {
        type: blob.type || 'application/octet-stream',
      });
    },
    [fallbackAccountId]
  );

  const uploadInto = useCallback(
    async (folderId: string, attachments: RecordAttachment[], label: string) => {
      const files = await Promise.all(attachments.map(toFile));
      const uploaded = await uploadManager.enqueueUploadsAndWait(
        files.map((file) => ({
          file,
          data: {
            name: file.name,
            parentId: folderId,
            mimeType: file.type || undefined,
            size: file.size,
          },
        })),
        { label }
      );
      const ids = uploaded.map((item) => item?.id).filter((id): id is string => !!id);
      if (ids.length !== attachments.length) {
        throw new Error('The upload finished without a file id.');
      }
      return ids;
    },
    [toFile, uploadManager]
  );

  /** Files a created record's attachments; returns a warning instead of throwing. */
  const attachToRecord = useCallback(
    async (
      projectId: string,
      entityType: ProjectEntityFolderType,
      entityId: string,
      attachments: RecordAttachment[],
      recordLabel: string
    ): Promise<string | undefined> => {
      if (attachments.length === 0) return undefined;
      try {
        const folderId = await filesApi.getProjectEntityFolderId(
          projectId,
          entityType,
          entityId,
          entityType === 'RFQ' ? 'ENTITY_BACKUP_DOCUMENTS' : undefined
        );
        await uploadInto(folderId, attachments, `${recordLabel} attachments`);
        return undefined;
      } catch (error) {
        const reason = error instanceof Error ? error.message : 'unknown error';
        const names = attachments.map(recordAttachmentName).join(', ');
        return `${recordLabel} was created, but ${names} could not be attached (${reason}). Add it from the ${recordLabel} page.`;
      }
    },
    [uploadInto]
  );

  return useCallback(
    async (action: RecordAgentAction): Promise<RecordActionResult> => {
      switch (action.action) {
        case 'create_rfq': {
          const rfq = await createRfq.mutateAsync(toCreateRfqInput(action));
          const label = rfq.rfqNumber ?? 'The RFQ';
          const warning = await attachToRecord(
            action.projectId,
            'RFQ',
            rfq.id,
            recordActionAttachments(action),
            label
          );
          return { output: `${label} created as a draft on ${action.projectName}.`, warning };
        }
        case 'award_rfq': {
          await awardRfq.mutateAsync({
            rfqId: action.rfqId,
            quoteId: action.quoteId,
            negotiationAmount: action.negotiationAmount ?? null,
          });
          return { output: `${action.rfqNumber} awarded to ${action.vendorName}.` };
        }
        case 'create_po': {
          const po = await createPo.mutateAsync(toCreatePoInput(action));
          const label = po.poNumber ?? 'The purchase order';
          const warning = await attachToRecord(
            action.projectId,
            'PURCHASE_ORDER',
            po.id,
            recordActionAttachments(action),
            label
          );
          if (action.issue) {
            // Issued without the vendor email; sending mail stays a separate,
            // explicit step on the PO page.
            await issuePo.mutateAsync({ id: po.id, emailVendor: false });
            return { output: `${label} created and issued to ${action.vendorName}.`, warning };
          }
          return { output: `${label} created as a draft for ${action.vendorName}.`, warning };
        }
        case 'create_sco': {
          const sco = await createSco.mutateAsync(toCreateScoInput(action));
          const label = sco.scoNumber ?? 'The change order';
          const warning = await attachToRecord(
            action.projectId,
            'SUB_CHANGE_ORDER',
            sco.id,
            recordActionAttachments(action),
            label
          );
          return { output: `${label} created as a draft on ${action.poNumber}.`, warning };
        }
        case 'log_invoice': {
          const attachments = recordActionAttachments(action);
          if (attachments.length === 0) throw new Error('Attach the invoice before logging it.');
          let attachmentIds: string[];
          try {
            const folderId = await filesApi.getProjectSubFolderId(action.projectId, 'INVOICE');
            attachmentIds = await uploadInto(folderId, attachments, 'Invoice attachment');
          } catch (error) {
            const reason = error instanceof Error ? error.message : 'unknown error';
            throw new Error(
              `Couldn't attach ${attachments.map(recordAttachmentName).join(', ')} (${reason}). The invoice was not logged.`,
              { cause: error }
            );
          }
          const invoice = await createInvoice.mutateAsync(
            toCreateInvoiceInput(action, attachmentIds)
          );
          return {
            output:
              `Invoice ${invoice.invoiceNumber ?? action.externalInvoiceNumber ?? ''} logged against ${action.poNumber}.`.replace(
                /\s+/g,
                ' '
              ),
          };
        }
      }
    },
    [attachToRecord, awardRfq, createInvoice, createPo, createRfq, createSco, issuePo, uploadInto]
  );
}
