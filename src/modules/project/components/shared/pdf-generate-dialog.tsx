import { useEffect, useMemo } from 'react';

import { Button } from '@/app/components/ui/button';
import { Checkbox } from '@/app/components/ui/checkbox';
import {
  Dialog,
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
import type {
  GeneratePdfTermsInput,
  PdfNoticeOption,
  PdfTermsOption,
} from '@/modules/pdf/schemas';
import UnderlineExtension from '@tiptap/extension-underline';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  Bold,
  Download,
  Eraser,
  FileText,
  Italic,
  List,
  ListOrdered,
  Loader2,
  Save,
  Underline,
} from 'lucide-react';
import { toast } from 'sonner';

export type PdfGenerateDialogProps = {
  open: boolean;
  title: string;
  onOpenChange: (open: boolean) => void;
  includeNotice: boolean;
  noticeTitle: string;
  noticeHtml: string;
  noticeOptions?: PdfNoticeOption[];
  selectedNoticeOptionId?: string;
  includeTerms: boolean;
  termsHtml: string;
  termsOptions?: PdfTermsOption[];
  selectedTermsOptionId?: string;
  previewFile: GeneratedPdfFile | null;
  isPreviewStale?: boolean;
  isGenerating: boolean;
  isSaving?: boolean;
  canSave?: boolean;
  onIncludeNoticeChange: (includeNotice: boolean) => void;
  onNoticeOptionChange?: (optionId: string) => void;
  onNoticeTitleChange: (noticeTitle: string) => void;
  onNoticeHtmlChange: (noticeHtml: string) => void;
  onIncludeTermsChange: (includeTerms: boolean) => void;
  onTermsOptionChange?: (optionId: string) => void;
  onTermsHtmlChange: (termsHtml: string) => void;
  onGenerate: (data: GeneratePdfTermsInput) => void;
  onSave?: (data: GeneratePdfTermsInput) => void;
};

type TermsEditorProps = {
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
};

function stripHtml(value: string): string {
  return value
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .trim();
}

export function TermsEditor({ value, disabled, onChange }: TermsEditorProps) {
  const editor = useEditor({
    content: value || '<p></p>',
    editable: !disabled,
    editorProps: {
      attributes: {
        class:
          'h-full min-h-full px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      },
    },
    extensions: [
      StarterKit.configure({
        heading: false,
      }),
      UnderlineExtension,
    ],
    onUpdate: ({ editor: activeEditor }) => onChange(activeEditor.getHTML()),
  });

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [disabled, editor]);

  useEffect(() => {
    if (!editor) return;

    const nextContent = value || '<p></p>';
    if (editor.getHTML() !== nextContent) {
      editor.commands.setContent(nextContent, { emitUpdate: false });
    }
  }, [editor, value]);

  const commands = [
    {
      action: () => editor?.chain().focus().toggleBold().run(),
      active: editor?.isActive('bold') ?? false,
      disabled: !editor?.can().chain().focus().toggleBold().run(),
      label: 'Bold',
      icon: Bold,
    },
    {
      action: () => editor?.chain().focus().toggleItalic().run(),
      active: editor?.isActive('italic') ?? false,
      disabled: !editor?.can().chain().focus().toggleItalic().run(),
      label: 'Italic',
      icon: Italic,
    },
    {
      action: () => editor?.chain().focus().toggleUnderline().run(),
      active: editor?.isActive('underline') ?? false,
      disabled: !editor?.can().chain().focus().toggleUnderline().run(),
      label: 'Underline',
      icon: Underline,
    },
    {
      action: () => editor?.chain().focus().toggleBulletList().run(),
      active: editor?.isActive('bulletList') ?? false,
      disabled: !editor?.can().chain().focus().toggleBulletList().run(),
      label: 'Bulleted list',
      icon: List,
    },
    {
      action: () => editor?.chain().focus().toggleOrderedList().run(),
      active: editor?.isActive('orderedList') ?? false,
      disabled: !editor?.can().chain().focus().toggleOrderedList().run(),
      label: 'Numbered list',
      icon: ListOrdered,
    },
    {
      action: () => editor?.chain().focus().unsetAllMarks().clearNodes().run(),
      active: false,
      disabled: !editor,
      label: 'Clear formatting',
      icon: Eraser,
    },
  ];

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-md border bg-background">
      <div className="flex shrink-0 flex-wrap items-center gap-1 border-b bg-muted/40 p-2">
        {commands.map(({ action, active, disabled: commandDisabled, label, icon: Icon }) => (
          <Button
            key={label}
            type="button"
            variant={active ? 'outline' : 'ghost'}
            size="sm"
            mode="icon"
            className="size-8"
            aria-label={label}
            disabled={disabled || commandDisabled}
            title={label}
            onClick={action}
          >
            <Icon className="size-4" />
          </Button>
        ))}
      </div>
      <EditorContent
        editor={editor}
        className={cn(
          'min-h-0 flex-1 overflow-y-auto',
          '[&_ol]:ml-5 [&_ol]:list-decimal [&_ul]:ml-5 [&_ul]:list-disc [&_p]:mb-2',
          disabled && 'cursor-not-allowed opacity-60'
        )}
      />
    </div>
  );
}

function PdfPreviewPane({
  file,
  isStale = false,
  isGenerating,
  isSaving = false,
  canSave = false,
  onSave,
  className,
}: {
  file: GeneratedPdfFile | null;
  isStale?: boolean;
  isGenerating: boolean;
  isSaving?: boolean;
  canSave?: boolean;
  onSave?: () => void;
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
      <div className="flex min-h-16 items-center justify-between gap-3 border-b bg-background px-5 py-4 pe-14">
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
            disabled={!file || isGenerating || isSaving || !canSave || !onSave}
            onClick={onSave}
          >
            {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            {isSaving ? 'Saving...' : 'Save to Files'}
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
              title={file?.fileName ?? 'PDF preview'}
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
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  Set the options on the left, then generate the PDF.
                </p>
              </>
            )}
          </div>
        )}
        {objectUrl && (isGenerating || isSaving) && (
          <div className="absolute inset-3 flex items-center justify-center rounded-md bg-background/70">
            <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm shadow-sm">
              <Loader2 className="size-4 animate-spin" />
              {isSaving ? 'Saving PDF...' : 'Regenerating PDF...'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function PdfGenerateDialog({
  open,
  title,
  onOpenChange,
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
  isPreviewStale = false,
  isGenerating,
  isSaving = false,
  canSave = false,
  onIncludeNoticeChange,
  onNoticeOptionChange,
  onNoticeTitleChange,
  onNoticeHtmlChange,
  onIncludeTermsChange,
  onTermsOptionChange,
  onTermsHtmlChange,
  onGenerate,
  onSave,
}: PdfGenerateDialogProps) {
  const hasNoticeOptions = noticeOptions.length > 0;
  const isBusy = isGenerating || isSaving;

  function buildPdfRequest(): GeneratePdfTermsInput | null {
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

  function handleGenerate() {
    const request = buildPdfRequest();
    if (!request) return;
    onGenerate(request);
  }

  function handleSave() {
    const request = buildPdfRequest();
    if (!request) return;
    onSave?.(request);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent variant="fullscreen" className="gap-0 overflow-hidden p-0">
        <div className="grid h-full min-h-0 lg:grid-cols-3">
          <div className="flex min-h-0 flex-col border-r bg-background lg:col-span-1">
            <DialogHeader className="border-b px-5 py-4">
              <DialogTitle>{title}</DialogTitle>
            </DialogHeader>

            <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-5">
              <Field orientation="horizontal" className="items-start rounded-md border p-3">
                <Checkbox
                  id="pdf-notice"
                  checked={includeNotice}
                  disabled={isBusy}
                  onCheckedChange={(checked) => onIncludeNoticeChange(checked === true)}
                />
                <div className="space-y-1">
                  <FieldLabel htmlFor="pdf-notice" className="w-auto">
                    Add Warning Box
                  </FieldLabel>
                </div>
              </Field>

              {includeNotice && (
                <>
                  {noticeOptions.length > 1 && (
                    <Field>
                      <FieldLabel className="text-xs font-semibold tracking-normal uppercase">
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

                  {!hasNoticeOptions && (
                    <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
                      No warning templates are configured yet. You can still enter one manually.
                    </div>
                  )}

                  <Field>
                    <FieldLabel className="text-xs font-semibold tracking-normal uppercase">
                      Warning Title
                    </FieldLabel>
                    <Input
                      value={noticeTitle}
                      disabled={isBusy}
                      placeholder="DO NOT START FABRICATION BEFORE READING THIS"
                      onChange={(event) => onNoticeTitleChange(event.target.value)}
                    />
                  </Field>

                  <Field>
                    <FieldLabel className="text-xs font-semibold tracking-normal uppercase">
                      Warning Message
                    </FieldLabel>
                    <div className="h-[240px]">
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
                  id="pdf-terms"
                  checked={includeTerms}
                  disabled={isBusy}
                  onCheckedChange={(checked) => onIncludeTermsChange(checked === true)}
                />
                <div className="space-y-1">
                  <FieldLabel htmlFor="pdf-terms" className="w-auto">
                    Add Terms and Conditions
                  </FieldLabel>
                </div>
              </Field>

              {includeTerms && (
                <>
                  {termsOptions.length > 1 && (
                    <Field>
                      <FieldLabel className="text-xs font-semibold tracking-normal uppercase">
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
                  <Field className="min-h-0 flex-1">
                    <FieldLabel className="text-xs font-semibold tracking-normal uppercase">
                      Terms and Conditions
                    </FieldLabel>
                    <div className="h-[300px]">
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

            <DialogFooter className="border-t p-4">
              <Button variant="outline" disabled={isBusy} onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button disabled={isBusy} onClick={handleGenerate}>
                {isGenerating ? 'Generating...' : previewFile ? 'Regenerate PDF' : 'Generate PDF'}
              </Button>
            </DialogFooter>
          </div>

          <PdfPreviewPane
            className="lg:col-span-2"
            file={previewFile}
            isStale={isPreviewStale}
            isGenerating={isGenerating}
            isSaving={isSaving}
            canSave={canSave}
            onSave={handleSave}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
