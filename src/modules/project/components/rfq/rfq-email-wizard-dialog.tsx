import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/app/components/ui/button';
import { Checkbox } from '@/app/components/ui/checkbox';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { Field, FieldLabel } from '@/app/components/ui/field';
import { Input } from '@/app/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { downloadGeneratedPdf, type GeneratedPdfFile } from '@/app/lib/generated-pdf';
import { cn } from '@/app/lib/utils';
import { EmailComposePreviewForm } from '@/modules/mail/components/email-compose-preview-dialog';
import type {
  FeatureMailDraft,
  FeatureMailDraftPayload,
} from '@/modules/mail/schemas/mail.schema';
import type {
  GeneratePdfTermsInput,
  PdfNoticeOption,
  PdfTermsOption,
} from '@/modules/pdf/schemas';
import { TermsEditor } from '@/modules/project/components/shared/pdf-generate-dialog';
import { ArrowLeft, Download, FileText, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';

type RfqEmailWizardDialogProps = {
  open: boolean;
  title: string;
  pdfTitle: string;
  pdfSectionLabel?: string;
  sendLabel?: string;
  sendingLabel?: string;
  onOpenChange: (open: boolean) => void;
  draft: FeatureMailDraft | null;
  isDraftLoading: boolean;
  isGenerating: boolean;
  isSaving?: boolean;
  isSending: boolean;
  canSavePdf?: boolean;
  pdfPreviewFile: GeneratedPdfFile | null;
  isPdfPreviewStale?: boolean;
  includeNotice: boolean;
  noticeTitle: string;
  noticeHtml: string;
  noticeOptions?: PdfNoticeOption[];
  selectedNoticeOptionId?: string;
  includeTerms: boolean;
  termsHtml: string;
  termsOptions?: PdfTermsOption[];
  selectedTermsOptionId?: string;
  onIncludeNoticeChange: (includeNotice: boolean) => void;
  onNoticeOptionChange?: (optionId: string) => void;
  onNoticeTitleChange: (noticeTitle: string) => void;
  onNoticeHtmlChange: (noticeHtml: string) => void;
  onIncludeTermsChange: (includeTerms: boolean) => void;
  onTermsOptionChange?: (optionId: string) => void;
  onTermsHtmlChange: (termsHtml: string) => void;
  onGeneratePdf: (data: GeneratePdfTermsInput) => void;
  onSavePdf?: (data: GeneratePdfTermsInput) => void;
  onSend: (payload: FeatureMailDraftPayload, pdfOptions: GeneratePdfTermsInput) => Promise<void>;
};

type Step = 'pdf' | 'email';

function stripHtml(value: string): string {
  return value
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .trim();
}

function buildPdfRequest({
  includeNotice,
  noticeTitle,
  noticeHtml,
  includeTerms,
  termsHtml,
}: {
  includeNotice: boolean;
  noticeTitle: string;
  noticeHtml: string;
  includeTerms: boolean;
  termsHtml: string;
}): GeneratePdfTermsInput | null {
  if (includeNotice && !noticeTitle.trim()) {
    toast.error('Enter a warning title before generating the PDF.');
    return null;
  }

  if (includeNotice && !stripHtml(noticeHtml)) {
    toast.error('Enter warning content before generating the PDF.');
    return null;
  }

  if (includeTerms && !stripHtml(termsHtml)) {
    toast.error('Enter terms and conditions before generating the PDF.');
    return null;
  }

  return {
    addWarningNotice: includeNotice,
    warningNoticeTitle: includeNotice ? noticeTitle : undefined,
    warningNoticeHtml: includeNotice ? noticeHtml : undefined,
    addTermsAndConditions: includeTerms,
    termsAndConditionsHtml: includeTerms ? termsHtml : undefined,
  };
}

export function RfqEmailWizardDialog({
  open,
  title,
  pdfTitle,
  pdfSectionLabel = 'RFQ PDF',
  sendLabel = 'Send RFQ Email',
  sendingLabel = 'Sending...',
  onOpenChange,
  draft,
  isDraftLoading,
  isGenerating,
  isSaving = false,
  isSending,
  canSavePdf = false,
  pdfPreviewFile,
  isPdfPreviewStale = false,
  includeNotice,
  noticeTitle,
  noticeHtml,
  noticeOptions = [],
  selectedNoticeOptionId,
  includeTerms,
  termsHtml,
  termsOptions = [],
  selectedTermsOptionId,
  onIncludeNoticeChange,
  onNoticeOptionChange,
  onNoticeTitleChange,
  onNoticeHtmlChange,
  onIncludeTermsChange,
  onTermsOptionChange,
  onTermsHtmlChange,
  onGeneratePdf,
  onSavePdf,
  onSend,
}: RfqEmailWizardDialogProps) {
  const [step, setStep] = useState<Step>('pdf');
  const isBusy = isGenerating || isSaving || isSending;
  const pdfOptions = useMemo(
    () =>
      buildPdfRequest({
        includeNotice,
        noticeTitle,
        noticeHtml,
        includeTerms,
        termsHtml,
      }),
    [includeNotice, includeTerms, noticeHtml, noticeTitle, termsHtml]
  );

  function handleDialogOpenChange(nextOpen: boolean) {
    if (!nextOpen) setStep('pdf');
    onOpenChange(nextOpen);
  }

  function closeDialog() {
    handleDialogOpenChange(false);
  }

  function getPdfRequest(): GeneratePdfTermsInput | null {
    return buildPdfRequest({
      includeNotice,
      noticeTitle,
      noticeHtml,
      includeTerms,
      termsHtml,
    });
  }

  function handleGenerate() {
    const request = getPdfRequest();
    if (!request) return;
    onGeneratePdf(request);
  }

  function handleSave() {
    const request = getPdfRequest();
    if (!request) return;
    onSavePdf?.(request);
  }

  async function handleSend(payload: FeatureMailDraftPayload) {
    const request = getPdfRequest();
    if (!request) return;
    await onSend(payload, request);
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent variant="fullscreen" className="gap-0 overflow-hidden p-0">
        <DialogHeader className="mb-0 border-b px-5 py-4 pe-14">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <DialogTitle className="text-base">{title}</DialogTitle>
            <div className="flex items-center rounded-md border bg-muted/30 p-1 text-xs font-medium">
              <StepPill active={step === 'pdf'}>1. PDF</StepPill>
              <StepPill active={step === 'email'}>2. Email</StepPill>
            </div>
          </div>
        </DialogHeader>

        {step === 'pdf' ? (
          <PdfWizardStep
            pdfTitle={pdfTitle}
            pdfSectionLabel={pdfSectionLabel}
            includeNotice={includeNotice}
            noticeTitle={noticeTitle}
            noticeHtml={noticeHtml}
            noticeOptions={noticeOptions}
            selectedNoticeOptionId={selectedNoticeOptionId}
            includeTerms={includeTerms}
            termsHtml={termsHtml}
            termsOptions={termsOptions}
            selectedTermsOptionId={selectedTermsOptionId}
            previewFile={pdfPreviewFile}
            isGenerating={isGenerating}
            isSaving={isSaving}
            canSavePdf={canSavePdf}
            isPreviewStale={isPdfPreviewStale}
            canContinue={!!pdfPreviewFile && !isPdfPreviewStale && !!pdfOptions && !isBusy}
            onIncludeNoticeChange={onIncludeNoticeChange}
            onNoticeOptionChange={onNoticeOptionChange}
            onNoticeTitleChange={onNoticeTitleChange}
            onNoticeHtmlChange={onNoticeHtmlChange}
            onIncludeTermsChange={onIncludeTermsChange}
            onTermsOptionChange={onTermsOptionChange}
            onTermsHtmlChange={onTermsHtmlChange}
            onGenerate={handleGenerate}
            onSave={handleSave}
            onCancel={closeDialog}
            onContinue={() => setStep('email')}
          />
        ) : isDraftLoading || !draft ? (
          <EmailLoadingStep
            onBack={() => setStep('pdf')}
            onCancel={closeDialog}
          />
        ) : (
          <EmailComposePreviewForm
            key={getEmailFormKey(draft)}
            draft={draft}
            isSending={isSending}
            recipientsReadOnly
            sendLabel={sendLabel}
            sendingLabel={sendingLabel}
            footerStart={
              <Button variant="outline" disabled={isSending} onClick={() => setStep('pdf')}>
                <ArrowLeft className="size-4" />
                Back
              </Button>
            }
            onCancel={closeDialog}
            onSend={handleSend}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function StepPill({ active, children }: { active: boolean; children: string }) {
  return (
    <div
      className={cn(
        'rounded px-2.5 py-1 transition-colors',
        active ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
      )}
    >
      {children}
    </div>
  );
}

function PdfWizardStep({
  pdfTitle,
  pdfSectionLabel,
  includeNotice,
  noticeTitle,
  noticeHtml,
  noticeOptions = [],
  selectedNoticeOptionId,
  includeTerms,
  termsHtml,
  termsOptions = [],
  selectedTermsOptionId,
  previewFile,
  isPreviewStale,
  isGenerating,
  isSaving = false,
  canSavePdf = false,
  canContinue,
  onIncludeNoticeChange,
  onNoticeOptionChange,
  onNoticeTitleChange,
  onNoticeHtmlChange,
  onIncludeTermsChange,
  onTermsOptionChange,
  onTermsHtmlChange,
  onGenerate,
  onSave,
  onCancel,
  onContinue,
}: Omit<RfqEmailWizardDialogProps, 'open' | 'title' | 'onOpenChange' | 'draft' | 'isDraftLoading' | 'isSending' | 'onGeneratePdf' | 'onSavePdf' | 'onSend' | 'pdfPreviewFile'> & {
  previewFile: GeneratedPdfFile | null;
  isPreviewStale: boolean;
  canContinue: boolean;
  onGenerate: () => void;
  onSave: () => void;
  onCancel: () => void;
  onContinue: () => void;
}) {
  const isBusy = isGenerating || isSaving;

  return (
    <>
      <DialogBody className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-3">
        <div className="min-h-0 overflow-y-auto border-b p-5 lg:border-b-0 lg:border-e">
          <div className="mb-5">
            <div className="text-xs font-semibold uppercase text-muted-foreground">
              {pdfSectionLabel}
            </div>
            <div className="mt-1 text-sm font-medium">{pdfTitle}</div>
          </div>
          <div className="space-y-5">
            <Field orientation="horizontal" className="items-start rounded-md border p-3">
              <Checkbox
                id="rfq-email-pdf-notice"
                checked={includeNotice}
                disabled={isBusy}
                onCheckedChange={(checked) => onIncludeNoticeChange(checked === true)}
              />
              <FieldLabel htmlFor="rfq-email-pdf-notice" className="w-auto">
                Add Warning Box
              </FieldLabel>
            </Field>

            {includeNotice && (
              <>
                {noticeOptions.length > 1 && (
                  <Field>
                    <FieldLabel className="text-xs font-semibold uppercase">
                      Warning Template
                    </FieldLabel>
                    <Select
                      value={selectedNoticeOptionId ?? ''}
                      disabled={isBusy || !onNoticeOptionChange}
                      onValueChange={(optionId) => onNoticeOptionChange?.(optionId)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select warning..." />
                      </SelectTrigger>
                      <SelectContent>
                        {noticeOptions.map((option) => (
                          <SelectItem key={option.id} value={option.id}>
                            {option.name}
                            {option.section === 'global' ? ' (Global)' : ''}
                            {option.isDefault ? ' (Default)' : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}

                <Field>
                  <FieldLabel className="text-xs font-semibold uppercase">Warning Title</FieldLabel>
                  <Input
                    value={noticeTitle}
                    disabled={isBusy}
                    placeholder="DO NOT START FABRICATION BEFORE READING THIS"
                    onChange={(event) => onNoticeTitleChange(event.target.value)}
                  />
                </Field>

                <Field>
                  <FieldLabel className="text-xs font-semibold uppercase">
                    Warning Message
                  </FieldLabel>
                  <div className="h-[220px]">
                    <TermsEditor
                      value={noticeHtml}
                      disabled={isBusy}
                      onChange={onNoticeHtmlChange}
                    />
                  </div>
                </Field>
              </>
            )}

            <Field orientation="horizontal" className="items-start rounded-md border p-3">
              <Checkbox
                id="rfq-email-pdf-terms"
                checked={includeTerms}
                disabled={isBusy}
                onCheckedChange={(checked) => onIncludeTermsChange(checked === true)}
              />
              <FieldLabel htmlFor="rfq-email-pdf-terms" className="w-auto">
                Add Terms and Conditions
              </FieldLabel>
            </Field>

            {includeTerms && (
              <>
                {termsOptions.length > 1 && (
                  <Field>
                    <FieldLabel className="text-xs font-semibold uppercase">
                      Terms Template
                    </FieldLabel>
                    <Select
                      value={selectedTermsOptionId ?? ''}
                      disabled={isBusy || !onTermsOptionChange}
                      onValueChange={(optionId) => onTermsOptionChange?.(optionId)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select terms..." />
                      </SelectTrigger>
                      <SelectContent>
                        {termsOptions.map((option) => (
                          <SelectItem key={option.id} value={option.id}>
                            {option.name}
                            {option.section === 'global' ? ' (Global)' : ''}
                            {option.isDefault ? ' (Default)' : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}

                <Field>
                  <FieldLabel className="text-xs font-semibold uppercase">
                    Terms and Conditions
                  </FieldLabel>
                  <div className="h-[280px]">
                    <TermsEditor
                      value={termsHtml}
                      disabled={isBusy}
                      onChange={onTermsHtmlChange}
                    />
                  </div>
                </Field>
              </>
            )}
          </div>
        </div>

        <PdfPreviewStepPane
          className="lg:col-span-2"
          file={previewFile}
          isStale={isPreviewStale}
          isGenerating={isGenerating}
          isSaving={isSaving}
          canSavePdf={canSavePdf}
          onSave={onSave}
        />
      </DialogBody>
      <DialogFooter className="border-t px-5 py-4 pt-4">
        <Button variant="outline" disabled={isBusy} onClick={onCancel}>
          Cancel
        </Button>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" disabled={isBusy} onClick={onGenerate}>
            {isGenerating ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <FileText className="size-4" />
            )}
            {isGenerating ? 'Generating...' : previewFile ? 'Regenerate PDF' : 'Generate PDF'}
          </Button>
          <Button disabled={!canContinue} onClick={onContinue}>
            Continue
          </Button>
        </div>
      </DialogFooter>
    </>
  );
}

function PdfPreviewStepPane({
  file,
  isStale,
  isGenerating,
  isSaving,
  canSavePdf,
  onSave,
  className,
}: {
  file: GeneratedPdfFile | null;
  isStale: boolean;
  isGenerating: boolean;
  isSaving: boolean;
  canSavePdf: boolean;
  onSave: () => void;
  className?: string;
}) {
  const objectUrl = useMemo(() => {
    if (!file) return null;
    return window.URL.createObjectURL(file.blob);
  }, [file]);

  useEffect(() => {
    return () => {
      if (objectUrl) window.URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);

  return (
    <div className={cn('flex min-h-0 flex-col bg-muted/30', className)}>
      <div className="flex min-h-16 items-center justify-between gap-3 border-b bg-background px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
            <FileText className="size-4 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">PDF Preview</div>
            <div className="truncate text-xs text-muted-foreground">
              {isStale && file
                ? 'Preview has edits pending. Regenerate to update it.'
                : (file?.fileName ?? 'Generate the PDF to preview it here')}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!file || isGenerating || isSaving || !canSavePdf}
            onClick={onSave}
          >
            {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!file || isGenerating || isSaving}
            onClick={() => {
              if (file) downloadGeneratedPdf(file);
            }}
          >
            <Download className="size-4" />
            Download
          </Button>
        </div>
      </div>
      <div className="relative min-h-0 flex-1 p-3">
        {objectUrl ? (
          <>
            <iframe
              src={objectUrl}
              title={file?.fileName ?? 'RFQ PDF preview'}
              className="h-full min-h-96 w-full rounded-md border bg-background"
            />
            {(isGenerating || isSaving || isStale) && (
              <div className="absolute inset-3 flex items-start justify-center rounded-md bg-background/45 p-4">
                <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm shadow-sm">
                  {isGenerating || isSaving ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <FileText className="size-4 text-muted-foreground" />
                  )}
                  {isSaving
                    ? 'Saving PDF...'
                    : isGenerating
                      ? 'Regenerating PDF...'
                      : 'Regenerate PDF to preview your latest edits.'}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex h-full min-h-96 flex-col items-center justify-center rounded-md border border-dashed bg-background text-center">
            {isGenerating ? (
              <>
                <Loader2 className="size-8 animate-spin text-muted-foreground" />
                <p className="mt-3 text-sm font-medium">Generating PDF...</p>
              </>
            ) : (
              <>
                <FileText className="size-10 text-muted-foreground/50" />
                <p className="mt-3 text-sm font-medium text-foreground">No PDF generated yet</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function EmailLoadingStep({
  onBack,
  onCancel,
}: {
  onBack: () => void;
  onCancel: () => void;
}) {
  return (
    <>
      <DialogBody className="flex min-h-0 flex-1 items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading email draft...
        </div>
      </DialogBody>
      <DialogFooter className="border-t px-5 py-4 pt-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="size-4" />
          Back
        </Button>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </DialogFooter>
    </>
  );
}

function getEmailFormKey(draft: FeatureMailDraft): string {
  return [draft.from, draft.to.join(','), draft.subject, draft.attachmentIds.join(',')].join('|');
}
