import { useState } from 'react';
import { FileText, Trash2 } from 'lucide-react';

import { Button } from '@app/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardToolbar,
} from '@app/components/ui/card';
import { Input } from '@app/components/ui/input';

import type { ContractAttachment } from '@modules/project/schemas/contract-attachment.schema';

interface ContractDocumentsCardProps {
  attachments: ContractAttachment[];
  isLoading: boolean;
  onAdd?: (fileId: string) => void;
  onRemove?: (attachmentId: string) => void;
  isAdding?: boolean;
  isRemoving?: boolean;
}

export function ContractDocumentsCard({
  attachments,
  isLoading,
  onAdd,
  onRemove,
  isAdding,
  isRemoving,
}: ContractDocumentsCardProps) {
  const [showAddInput, setShowAddInput] = useState(false);
  const [fileId, setFileId] = useState('');

  const handleAdd = () => {
    if (!fileId.trim() || !onAdd) return;
    onAdd(fileId.trim());
    setFileId('');
    setShowAddInput(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
          Contract Documents
        </CardTitle>
        <CardToolbar>
          <Button
            size="sm"
            variant="outline"
            disabled={!onAdd}
            onClick={() => setShowAddInput(true)}
          >
            + Add
          </Button>
        </CardToolbar>
      </CardHeader>
      <CardContent className="p-5">
        {showAddInput && (
          <div className="flex items-center gap-2 mb-4">
            <Input
              value={fileId}
              onChange={(e) => setFileId(e.target.value)}
              placeholder="Enter File ID"
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAdd();
                }
              }}
            />
            <Button size="sm" variant="primary" onClick={handleAdd} disabled={isAdding || !fileId.trim()}>
              {isAdding ? 'Adding...' : 'Save'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setShowAddInput(false);
                setFileId('');
              }}
            >
              Cancel
            </Button>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-10 bg-muted rounded animate-pulse" />
            ))}
          </div>
        ) : attachments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No contract documents attached.
          </p>
        ) : (
          <div className="space-y-2">
            {attachments.map((att) => (
              <div
                key={att.id}
                className="flex items-center gap-3 p-2.5 rounded-lg border"
              >
                <FileText className="size-4 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">
                    {att.document?.name ?? 'Untitled Document'}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">Document</span>
                {onRemove && (
                  <Button
                    variant="ghost"
                    mode="icon"
                    size="sm"
                    onClick={() => onRemove(att.id)}
                    disabled={isRemoving}
                  >
                    <Trash2 className="size-3.5 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
