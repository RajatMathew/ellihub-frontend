import { ConfirmDialog } from '@/app/components/ui/confirm-dialog';
import type { DirectorySelectOption } from '@/modules/directory/components/contacts/form/contact-form.types';
import { QuickCreateVendorDialog } from '@/modules/directory/components/quick-create-vendor-dialog';
import type { ContactAssociationsState } from '@/modules/directory/hooks/contacts/use-contact-associations';

interface ContactFormDialogsProps {
  associations: ContactAssociationsState;
  vendorOptions: DirectorySelectOption[];
  gcOptions: DirectorySelectOption[];
}

export function ContactFormDialogs({
  associations,
  vendorOptions,
  gcOptions,
}: ContactFormDialogsProps) {
  const replacementName = getReplacementName(
    associations.pendingAssociation,
    vendorOptions,
    gcOptions
  );

  return (
    <>
      <QuickCreateVendorDialog
        open={associations.vendorDialogOpen}
        onOpenChange={associations.setVendorDialogOpen}
        onCreated={associations.handleVendorCreated}
      />

      <ConfirmDialog
        open={associations.showReplaceConfirm}
        onOpenChange={associations.setShowReplaceConfirm}
        title="Change Association?"
        description={
          <>
            This contact is already linked to{' '}
            <strong>{associations.currentAssociation?.name}</strong>. Do you want to replace it with{' '}
            <strong>{replacementName}</strong>?
            <br />
            <br />
            Contacts can only be linked to one vendor or GC at a time.
          </>
        }
        confirmLabel="Replace Association"
        onConfirm={associations.confirmReplace}
        variant="primary"
      />

      <ConfirmDialog
        open={associations.showUnlinkConfirm}
        onOpenChange={associations.setShowUnlinkConfirm}
        title="Remove Association?"
        description={
          <>
            Remove the association with <strong>{associations.pendingUnlink?.name}</strong>?
            <br />
            <br />
            This contact will no longer be linked to this{' '}
            {associations.pendingUnlink?.type === 'VENDOR' ? 'vendor' : 'general contractor'}.
          </>
        }
        confirmLabel="Remove"
        onConfirm={associations.confirmUnlink}
        variant="destructive"
      />
    </>
  );
}

function getReplacementName(
  pendingAssociation: ContactAssociationsState['pendingAssociation'],
  vendorOptions: DirectorySelectOption[],
  gcOptions: DirectorySelectOption[]
) {
  if (!pendingAssociation) return 'the selected association';

  const options = pendingAssociation.type === 'VENDOR' ? vendorOptions : gcOptions;
  return (
    options.find((option) => option.value === pendingAssociation.id)?.label ?? pendingAssociation.id
  );
}
