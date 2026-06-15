import type { Dispatch, SetStateAction } from 'react';

import { Button } from '@/app/components/ui/button';
import { Switch } from '@/app/components/ui/switch';
import type {
  ContactAssociationType,
  ContactGCAssociation,
  ContactVendorAssociation,
  DirectorySelectOption,
} from '@/modules/directory/components/contacts/form/contact-form.types';
import { Building2, X } from 'lucide-react';

interface ContactAssociationListProps {
  vendorLinks: ContactVendorAssociation[];
  gcLinks: ContactGCAssociation[];
  vendorOptions: DirectorySelectOption[];
  gcOptions: DirectorySelectOption[];
  setVendorLinks: Dispatch<SetStateAction<ContactVendorAssociation[]>>;
  setGCLinks: Dispatch<SetStateAction<ContactGCAssociation[]>>;
  onUnlink: (index: number, type: ContactAssociationType, name: string) => void;
}

export function ContactAssociationList({
  vendorLinks,
  gcLinks,
  vendorOptions,
  gcOptions,
  setVendorLinks,
  setGCLinks,
  onUnlink,
}: ContactAssociationListProps) {
  return (
    <>
      {vendorLinks.length > 0 && (
        <div className="space-y-2">
          {vendorLinks.map((link, index) => {
            const vendorName =
              link.name ??
              vendorOptions.find((option) => option.value === link.vendorId)?.label ??
              link.vendorId;

            return (
              <AssociationRow
                key={link.vendorId}
                name={vendorName}
                isPrimary={link.isPrimary}
                onPrimaryChange={(checked) =>
                  setVendorLinks((prev) =>
                    prev.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, isPrimary: checked } : item
                    )
                  )
                }
                onRemove={() => onUnlink(index, 'VENDOR', vendorName)}
              />
            );
          })}
        </div>
      )}

      {gcLinks.length > 0 && (
        <div className="space-y-2">
          {gcLinks.map((link, index) => {
            const gcName =
              link.name ??
              gcOptions.find((option) => option.value === link.generalContractorId)?.label ??
              link.generalContractorId;

            return (
              <AssociationRow
                key={link.generalContractorId}
                name={gcName}
                isPrimary={link.isPrimary}
                onPrimaryChange={(checked) =>
                  setGCLinks((prev) =>
                    prev.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, isPrimary: checked } : item
                    )
                  )
                }
                onRemove={() => onUnlink(index, 'GC', gcName)}
              />
            );
          })}
        </div>
      )}
    </>
  );
}

function AssociationRow({
  name,
  isPrimary,
  onPrimaryChange,
  onRemove,
}: {
  name: string;
  isPrimary: boolean;
  onPrimaryChange: (checked: boolean) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-lg border border-border bg-accent/50 px-4 py-3 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Building2 className="size-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0 break-words text-sm font-medium text-foreground">{name}</span>
      </div>
      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        Primary
        <Switch checked={isPrimary} onCheckedChange={onPrimaryChange} />
      </label>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        mode="icon"
        className="size-7 self-start text-muted-foreground hover:text-destructive sm:self-auto"
        onClick={onRemove}
        aria-label={`Remove ${name}`}
      >
        <X className="size-3.5" />
      </Button>
    </div>
  );
}
