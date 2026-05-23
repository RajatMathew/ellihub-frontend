import { useEffect } from 'react';

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
import { cn } from '@/app/lib/utils';
import type { GeneratePOPdfInput } from '@/modules/project/schemas/purchase-order';
import UnderlineExtension from '@tiptap/extension-underline';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Bold, Eraser, Italic, List, ListOrdered, Underline } from 'lucide-react';
import { toast } from 'sonner';

type PurchaseOrderPdfDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  includeTerms: boolean;
  termsHtml: string;
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
          'min-h-48 px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
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
    <div className="overflow-hidden rounded-md border bg-background">
      <div className="flex flex-wrap items-center gap-1 border-b bg-muted/40 p-2">
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
          'max-h-80 overflow-y-auto',
          '[&_ol]:ml-5 [&_ol]:list-decimal [&_ul]:ml-5 [&_ul]:list-disc [&_p]:mb-2',
          disabled && 'cursor-not-allowed opacity-60'
        )}
      />
    </div>
  );
}

export function PurchaseOrderPdfDialog({
  open,
  onOpenChange,
  includeTerms,
  termsHtml,
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Generate Purchase Order PDF</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
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
            <Field>
              <FieldLabel className="text-xs font-semibold tracking-normal uppercase">
                Terms and Condition
              </FieldLabel>
              <TermsEditor value={termsHtml} disabled={isGenerating} onChange={onTermsHtmlChange} />
            </Field>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" disabled={isGenerating} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={isGenerating} onClick={handleGenerate}>
            {isGenerating ? 'Generating...' : 'Generate PDF'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
