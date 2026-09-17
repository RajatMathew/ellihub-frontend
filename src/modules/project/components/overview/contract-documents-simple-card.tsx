import { useMemo, useState } from 'react';

import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardToolbar } from '@/app/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/app/components/ui/tooltip';
import {
  FilePreviewDialog,
  type FilePreviewItem,
} from '@/modules/files/components/file-preview-dialog';
import { FileTypeIcon } from '@/modules/files/components/file-type-icon';
import { UploadFileDialog } from '@/modules/files/components/upload-file-dialog';
import { useUploadManager } from '@/modules/files/uploads/upload-manager-context';
import { ProjectInlineListLoading } from '@/modules/project/components/shared';
import type { ContractAttachment } from '@/modules/project/schemas/contract-attachment.schema';
import { EllipsisVertical, FileText, Pin, PinOff, Star, Upload } from 'lucide-react';
import { LayoutGroup, motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { TextMorph } from 'torph/react';

interface ContractDocumentsSimpleCardProps {
  documents: ContractAttachment[];
  isLoading?: boolean;
  isAdding?: boolean;
  isRemoving?: boolean;
  documentsUrl?: string;
  parentFolderId?: string;
  onUploadAndPin?: (fileId: string) => Promise<void> | void;
  onPinClick?: () => void;
  onUnpin?: (attachmentId: string) => void;
  onSetPrimary?: (attachmentId: string, isPrimary: boolean) => void;
  isSettingPrimary?: boolean;
}

const CONTRACT_DOCUMENT_REORDER_TRANSITION = {
  type: 'spring' as const,
  stiffness: 420,
  damping: 34,
  mass: 0.8,
};

interface ContractDocumentActionsProps {
  attachmentId: string;
  documentName: string;
  isPrimary: boolean;
  onSetPrimary?: (attachmentId: string, isPrimary: boolean) => void;
  onUnpin?: (attachmentId: string) => void;
  isSettingPrimary: boolean;
  isRemoving: boolean;
}

const KNOWN_FILE_EXTENSIONS = new Set([
  '7z',
  'csv',
  'doc',
  'docx',
  'dwg',
  'dxf',
  'heic',
  'heif',
  'ifc',
  'jpeg',
  'jpg',
  'm4a',
  'm4v',
  'mov',
  'mp3',
  'mp4',
  'mpp',
  'nwc',
  'nwd',
  'pdf',
  'png',
  'ppt',
  'pptx',
  'rfa',
  'rtf',
  'rvt',
  'skp',
  'tif',
  'tiff',
  'txt',
  'wav',
  'webm',
  'webp',
  'xls',
  'xlsm',
  'xlsx',
  'xml',
  'zip',
]);

function getKnownFileExtension(name: string | null | undefined) {
  if (!name) return null;

  const dotIndex = name.lastIndexOf('.');
  if (dotIndex <= 0 || dotIndex >= name.length - 1) return null;

  const extension = name.slice(dotIndex + 1).toLowerCase();
  return KNOWN_FILE_EXTENSIONS.has(extension) ? extension : null;
}

function getExtensionFromMimeType(mimeType: string | null | undefined) {
  if (!mimeType) return null;

  const mimeToExtension: Record<string, string> = {
    'application/msword': 'doc',
    'application/pdf': 'pdf',
    'application/rtf': 'rtf',
    'application/vnd.ms-excel': 'xls',
    'application/vnd.ms-powerpoint': 'ppt',
    'application/vnd.ms-project': 'mpp',
    'application/vnd.ms-excel.sheet.macroenabled.12': 'xlsm',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/x-7z-compressed': '7z',
    'application/x-zip-compressed': 'zip',
    'application/zip': 'zip',
    'audio/mpeg': 'mp3',
    'audio/mp4': 'm4a',
    'audio/wav': 'wav',
    'image/heic': 'heic',
    'image/heif': 'heif',
    'image/jpeg': 'jpg',
    'image/pjpeg': 'jpg',
    'image/png': 'png',
    'image/tiff': 'tif',
    'image/vnd.dwg': 'dwg',
    'image/vnd.dxf': 'dxf',
    'image/webp': 'webp',
    'text/csv': 'csv',
    'text/plain': 'txt',
    'text/xml': 'xml',
    'video/mp4': 'mp4',
    'video/quicktime': 'mov',
    'video/webm': 'webm',
  };

  return mimeToExtension[mimeType.toLowerCase()] ?? null;
}

function getDocumentDisplayName(
  displayName: string,
  fileName: string | null | undefined,
  objectId: string | null | undefined,
  mimeType: string | null | undefined
) {
  if (getKnownFileExtension(displayName)) return displayName;

  const nameExtension = getKnownFileExtension(fileName);
  if (nameExtension) return `${displayName}.${nameExtension}`;

  const objectExtension = getKnownFileExtension(objectId);
  if (objectExtension) return `${displayName}.${objectExtension}`;

  const mimeExtension = getExtensionFromMimeType(mimeType);
  if (!mimeExtension) return displayName;

  return `${displayName}.${mimeExtension}`;
}

function ContractDocumentActions({
  attachmentId,
  documentName,
  isPrimary,
  onSetPrimary,
  onUnpin,
  isSettingPrimary,
  isRemoving,
}: ContractDocumentActionsProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  if (!onSetPrimary && !onUnpin) return null;

  const primaryActionWidth = isPrimary ? 'w-[5.75rem]' : 'w-8';
  const actionsWidth = onUnpin ? (isPrimary ? 'w-[8.25rem]' : 'w-[4.5rem]') : primaryActionWidth;

  return (
    <div
      className={`shrink-0 overflow-hidden transition-[width] duration-200 ease-out ${actionsWidth}`}
    >
      <div className="flex items-center justify-end">
        {onSetPrimary && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                disabled={isSettingPrimary}
                className={`shrink-0 overflow-hidden px-0 transition-[width,color,background-color] duration-200 ease-out ${
                  isPrimary
                    ? 'bg-primary-soft text-primary hover:bg-primary-soft hover:text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                } ${primaryActionWidth}`}
                aria-label={
                  isPrimary
                    ? `Remove primary mark from ${documentName}`
                    : `Mark ${documentName} primary`
                }
                onClick={() => onSetPrimary(attachmentId, !isPrimary)}
              >
                <Star
                  className={`size-4 shrink-0 transition-[color,fill,transform] duration-200 ${
                    isPrimary ? 'fill-current text-primary' : ''
                  }`}
                />
                <span
                  className={`min-w-0 overflow-hidden text-xs font-medium transition-[width,opacity,transform] duration-200 ease-out ${
                    isPrimary ? 'w-11 translate-x-0 opacity-100' : 'w-0 translate-x-1 opacity-0'
                  }`}
                >
                  <TextMorph>{isPrimary ? 'Primary' : ''}</TextMorph>
                </span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isPrimary ? 'Remove primary mark' : 'Mark primary'}</TooltipContent>
          </Tooltip>
        )}

        {onUnpin && (
          <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                mode="icon"
                size="sm"
                className="ms-1 shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                aria-label={`More actions for ${documentName}`}
              >
                <EllipsisVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem
                variant="destructive"
                disabled={isRemoving}
                className="whitespace-nowrap"
                onClick={() => onUnpin(attachmentId)}
              >
                <PinOff className="size-4" />
                Unpin from overview
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}

export function ContractDocumentsSimpleCard({
  documents,
  isLoading = false,
  isAdding = false,
  isRemoving = false,
  documentsUrl,
  parentFolderId,
  onUploadAndPin,
  onPinClick,
  onUnpin,
  onSetPrimary,
  isSettingPrimary = false,
}: ContractDocumentsSimpleCardProps) {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<FilePreviewItem | null>(null);
  const uploadManager = useUploadManager();
  const sortedDocuments = useMemo(
    () =>
      [...documents].sort((a, b) => {
        if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
        return new Date(b.uploadedAt ?? 0).getTime() - new Date(a.uploadedAt ?? 0).getTime();
      }),
    [documents]
  );

  const handleUploadSubmit = (payloads: Parameters<typeof uploadManager.enqueueUploads>[0]) => {
    uploadManager.enqueueUploads(payloads, {
      label: 'Contract documents',
      onUploaded: async (uploaded) => {
        await onUploadAndPin?.(uploaded.id);
      },
    });
    setUploadOpen(false);
  };

  const handlePreviewDocument = (file: FilePreviewItem) => {
    if (file.deletedAt) {
      toast.error('This file no longer exists or has been deleted.');
      return;
    }

    setPreviewFile(file);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between px-4 py-2.5">
        {documentsUrl ? (
          <CardTitle className="text-xs font-semibold tracking-[0.18em] uppercase">
            <Link to={documentsUrl} className="hover:underline">
              Contract Documents ({documents.length})
            </Link>
          </CardTitle>
        ) : (
          <CardTitle className="text-xs font-semibold tracking-[0.18em] uppercase">
            Contract Documents ({documents.length})
          </CardTitle>
        )}
        {(onUploadAndPin || onPinClick) && (
          <CardToolbar>
            <div className="flex items-center gap-2">
              {onUploadAndPin && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!parentFolderId || isAdding}
                  onClick={() => setUploadOpen(true)}
                >
                  <Upload className="size-4" />
                  Upload
                </Button>
              )}
              {onPinClick && (
                <Button size="sm" variant="outline" onClick={onPinClick}>
                  <Pin className="size-4" />
                  Pin
                </Button>
              )}
            </div>
          </CardToolbar>
        )}
      </CardHeader>
      <CardContent className="px-3 py-2">
        {isLoading ? (
          <ProjectInlineListLoading rows={2} />
        ) : sortedDocuments.length > 0 ? (
          <LayoutGroup>
            <div className="divide-y divide-border">
              {sortedDocuments.map((att) => {
                const document = att.file ?? att.document;
                const baseDocumentName = document?.displayName ?? document?.name ?? 'Document';
                const documentName = getDocumentDisplayName(
                  baseDocumentName,
                  document?.name,
                  document?.objectId,
                  document?.mimeType
                );
                const isPrimary = att.isPrimary ?? false;

                return (
                  <motion.div
                    key={att.id}
                    layout="position"
                    transition={CONTRACT_DOCUMENT_REORDER_TRANSITION}
                    className="group flex items-center gap-3 px-0 py-2.5 transition-colors hover:bg-muted/10"
                  >
                    <FileTypeIcon
                      fileType={document?.type ?? 'FILE'}
                      mimeType={document?.mimeType}
                      fileName={document?.name ?? documentName}
                      className="size-[1.375rem] shrink-0 stroke-[2.1]"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-center gap-2">
                        {document?.id ? (
                          <button
                            type="button"
                            className="block min-w-0 truncate text-left text-[15px] leading-6 font-semibold text-[#17375f] underline-offset-4 transition-colors hover:text-[#0f2c4f] hover:underline"
                            aria-label={`Open preview for ${documentName}`}
                            title={
                              document?.deletedAt
                                ? 'This file no longer exists or has been deleted.'
                                : 'Open preview'
                            }
                            onClick={() => handlePreviewDocument(document)}
                          >
                            {documentName}
                          </button>
                        ) : (
                          <span className="block min-w-0 truncate text-[15px] leading-6 font-semibold text-[#17375f]">
                            {documentName}
                          </span>
                        )}
                      </div>
                    </div>
                    <ContractDocumentActions
                      attachmentId={att.id}
                      documentName={documentName}
                      isPrimary={isPrimary}
                      onSetPrimary={onSetPrimary}
                      onUnpin={onUnpin}
                      isSettingPrimary={isSettingPrimary}
                      isRemoving={isRemoving}
                    />
                  </motion.div>
                );
              })}
            </div>
          </LayoutGroup>
        ) : (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <FileText className="size-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No prime contracts pinned.</p>
          </div>
        )}
      </CardContent>

      {parentFolderId && (
        <UploadFileDialog
          multiple
          open={uploadOpen}
          onOpenChange={setUploadOpen}
          parentId={parentFolderId}
          onSubmit={(payloads) => void handleUploadSubmit(payloads)}
          isSubmitting={isAdding}
        />
      )}

      <FilePreviewDialog
        open={!!previewFile}
        onOpenChange={(open) => {
          if (!open) setPreviewFile(null);
        }}
        file={previewFile}
      />
    </Card>
  );
}
