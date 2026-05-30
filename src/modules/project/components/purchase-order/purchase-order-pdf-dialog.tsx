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
import { downloadGeneratedPdf, type GeneratedPdfFile } from '@/app/lib/generated-pdf';
import { cn } from '@/app/lib/utils';
import type { GeneratePOPdfInput } from '@/modules/project/schemas/purchase-order';
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
  Underline,
} from 'lucide-react';
import { toast } from 'sonner';

type PurchaseOrderPdfDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  includeTerms: boolean;
  termsHtml: string;
  previewFile: GeneratedPdfFile | null;
  isGenerating: boolean;
  onIncludeTermsChange: (includeTerms: boolean) => void;
  onTermsHtmlChange: (termsHtml: string) => void;
  onGenerate: (data: GeneratePOPdfInput) => void;
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

function TermsEditor({ value, disabled, onChange }: TermsEditorProps) {
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
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border bg-background">
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
  isGenerating,
  className,
}: {
  file: GeneratedPdfFile | null;
  isGenerating: boolean;
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
              {file?.fileName ?? 'Generate the PDF to preview it here'}
            </div>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={!file || isGenerating}
          onClick={() => {
            if (file) downloadGeneratedPdf(file);
          }}
        >
          <Download className="size-4" />
          Download
        </Button>
      </div>

      <div className="relative min-h-0 flex-1 p-3">
        {objectUrl ? (
          <iframe
            src={objectUrl}
            title={file?.fileName ?? 'Purchase order PDF preview'}
            className="h-full min-h-96 w-full rounded-md border bg-background"
          />
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
                  Set the options on the left, then generate the purchase order PDF.
                </p>
              </>
            )}
          </div>
        )}
        {objectUrl && isGenerating && (
          <div className="absolute inset-3 flex items-center justify-center rounded-md bg-background/70">
            <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm shadow-sm">
              <Loader2 className="size-4 animate-spin" />
              Regenerating PDF...
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function PurchaseOrderPdfDialog({
  open,
  onOpenChange,
  includeTerms,
  termsHtml,
  previewFile,
  isGenerating,
  onIncludeTermsChange,
  onTermsHtmlChange,
  onGenerate,
}: PurchaseOrderPdfDialogProps) {
  function handleGenerate() {
    if (includeTerms && !stripHtml(termsHtml)) {
      toast.error('Enter terms and conditions before generating the PDF.');
      return;
    }

    onGenerate({
      addTermsAndConditions: includeTerms,
      termsAndConditionsHtml: includeTerms ? termsHtml : undefined,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent variant="fullscreen" className="gap-0 overflow-hidden p-0">
        <div className="grid h-full min-h-0 lg:grid-cols-3">
          <div className="flex min-h-0 flex-col border-r bg-background lg:col-span-1">
            <DialogHeader className="border-b px-5 py-4">
              <DialogTitle>Generate Purchase Order PDF</DialogTitle>
            </DialogHeader>

            <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-5">
              <Field orientation="horizontal" className="items-start rounded-md border p-3">
                <Checkbox
                  id="po-pdf-terms"
                  checked={includeTerms}
                  disabled={isGenerating}
                  onCheckedChange={(checked) => onIncludeTermsChange(checked === true)}
                />
                <div className="space-y-1">
                  <FieldLabel htmlFor="po-pdf-terms" className="w-auto">
                    Add Terms and condition
                  </FieldLabel>
                </div>
              </Field>

              {includeTerms && (
                <Field className="min-h-0 flex-1">
                  <FieldLabel className="text-xs font-semibold tracking-normal uppercase">
                    Terms and Condition
                  </FieldLabel>
                  <TermsEditor
                    value={termsHtml}
                    disabled={isGenerating}
                    onChange={onTermsHtmlChange}
                  />
                </Field>
              )}
            </div>

            <DialogFooter className="border-t p-4">
              <Button variant="outline" disabled={isGenerating} onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button disabled={isGenerating} onClick={handleGenerate}>
                {isGenerating ? 'Generating...' : previewFile ? 'Regenerate PDF' : 'Generate PDF'}
              </Button>
            </DialogFooter>
          </div>

          <PdfPreviewPane
            className="lg:col-span-2"
            file={previewFile}
            isGenerating={isGenerating}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
