import {
  PdfGenerateDialog,
  TermsEditor,
  type PdfGenerateDialogProps,
} from '@/modules/project/components/shared';

type PurchaseOrderPdfDialogProps = Omit<PdfGenerateDialogProps, 'title'>;

export { TermsEditor };

export function PurchaseOrderPdfDialog(props: PurchaseOrderPdfDialogProps) {
  return <PdfGenerateDialog {...props} title="Generate Purchase Order PDF" />;
}
